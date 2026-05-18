import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { VerificationBatch, VerificationCode, Product } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(req as any);
    if (!user || user.email !== "mdmohsin.work@gmail.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const batches = await VerificationBatch.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(req as any);
    if (!user || user.email !== "mdmohsin.work@gmail.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { productId, count } = await req.json();
    if (!productId || !count || count <= 0) {
      return NextResponse.json({ error: "Product and valid count are required" }, { status: 400 });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 1. Generate unique codes
    const uniqueSet = new Set<string>();
    let attempts = 0;
    const maxAttempts = count * 10;

    while (uniqueSet.size < count && attempts < maxAttempts) {
      attempts++;
      const randStr = crypto.randomBytes(4).toString("hex").toUpperCase();
      const formatted = randStr.match(/.{1,4}/g)?.join("-");
      const fullCode = `PRL-${formatted}`;
      
      uniqueSet.add(fullCode);
    }

    if (uniqueSet.size < count) {
      return NextResponse.json({ error: "Failed to generate unique codes. Try again." }, { status: 500 });
    }

    const generatedCodesList = Array.from(uniqueSet);

    // 2. Check for duplicate codes already inside DB to prevent duplicate key errors
    const duplicates = await VerificationCode.find({ code: { $in: generatedCodesList } }).select("code").lean();
    const duplicateSet = new Set(duplicates.map(d => d.code));
    
    const finalCodes = generatedCodesList.filter(c => !duplicateSet.has(c));

    // If some were duplicates, fill the remaining
    let fillAttempts = 0;
    while (finalCodes.length < count && fillAttempts < 1000) {
      fillAttempts++;
      const randStr = crypto.randomBytes(4).toString("hex").toUpperCase();
      const formatted = randStr.match(/.{1,4}/g)?.join("-");
      const fullCode = `PRL-${formatted}`;

      if (!uniqueSet.has(fullCode)) {
        const exists = await VerificationCode.findOne({ code: fullCode }).lean();
        if (!exists) {
          uniqueSet.add(fullCode);
          finalCodes.push(fullCode);
        }
      }
    }

    if (finalCodes.length < count) {
      return NextResponse.json({ error: "Failed to verify database code uniqueness." }, { status: 500 });
    }

    // 3. Create the batch record
    const batch = await VerificationBatch.create({
      productId: product._id,
      productName: product.name,
      count,
      generatedBy: user.email,
    });

    // 4. Bulk insert the codes
    const codesToInsert = finalCodes.map(code => ({
      code,
      batchId: batch._id,
      productId: product._id,
      productName: product.name,
      isVerified: false,
    }));

    await VerificationCode.insertMany(codesToInsert);

    return NextResponse.json({
      success: true,
      batch,
      codes: finalCodes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
