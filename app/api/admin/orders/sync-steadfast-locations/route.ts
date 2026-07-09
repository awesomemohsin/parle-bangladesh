import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUserFromRequest(request);
    const isAdmin = user && ["admin", "super_admin", "owner", "moderator"].includes(user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: "Steadfast API credentials are not configured" }, { status: 500 });
    }

    const baseUrl = process.env.STEADFAST_API_URL || "https://portal.packzy.com/api/v1";
    const res = await fetch(`${baseUrl}/get_police_stations`, {
      method: "GET",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
    });

    const body = await res.json();

    if (res.status === 200 && body.status === 200 && Array.isArray(body.data)) {
      const data = body.data;

      const hierarchy: any = {
        divisions: [],
        districts: {},
        thanas: {},
        postcodes: {}
      };

      const divisionsSet = new Set<string>();
      const districtsMap = new Map<string, Set<string>>();
      const thanasMap = new Map<string, Set<string>>();
      const postcodesMap = new Map<string, Set<string>>();

      const metroThanas = [
        'Demra', 'Dhaka Cantt.', 'Dhaka Cantonment', 'Dhanmondi', 'Gulshan', 'Jatrabari',
        'Khilgaon', 'Khilkhet', 'Lalbag', 'Mirpur', 'Mohammadpur',
        'Motijheel', 'New market', 'Palton', 'Ramna', 'Sabujbag',
        'Sutrapur', 'Tejgaon', 'Tejgaon Industrial Area', 'Uttara',
        'Bimanbandar', 'Airport'
      ];

      const metroMapping: any = {
        'Dhaka': metroThanas,
        'Chittagong': ['Chittagong Sadar'],
        'Khulna': ['Khulna Sadar'],
        'Barisal': ['Barisal Sadar'],
        'Rajshahi': ['Rajshahi Sadar'],
        'Rangpur': ['Rangpur Sadar'],
        'Sylhet': ['Sylhet Sadar']
      };

      for (const entry of data) {
        if (!entry.division || !entry.district || !entry.name) {
          continue;
        }

        let div = String(entry.division).trim();
        let dist = String(entry.district).trim();
        const thana = String(entry.name).trim();
        const code = String(entry.post_code || entry.postcode || "").trim();

        // 1. Group Mymensingh Division
        if (['Mymensingh', 'Jamalpur', 'Netrakona', 'Sherpur'].includes(dist)) {
          div = 'Mymensingh';
        }

        // 2. Separate Metro Areas
        if (metroMapping[dist] && metroMapping[dist].includes(thana)) {
          dist = dist + ' Metro';
        }

        divisionsSet.add(div);

        if (!districtsMap.has(div)) districtsMap.set(div, new Set());
        districtsMap.get(div)!.add(dist);

        if (!thanasMap.has(dist)) thanasMap.set(dist, new Set());
        thanasMap.get(dist)!.add(thana);

        if (code) {
          const key = `${dist}_${thana}`;
          if (!postcodesMap.has(key)) postcodesMap.set(key, new Set());
          postcodesMap.get(key)!.add(code);
        }
      }

      // Add extra fallback thanas for Bimanbandar/Airport if not present
      const dhakaMetroThanas = thanasMap.get('Dhaka Metro');
      if (dhakaMetroThanas) {
        if (!dhakaMetroThanas.has('Bimanbandar')) {
          dhakaMetroThanas.add('Bimanbandar');
          const key = 'Dhaka Metro_Bimanbandar';
          if (!postcodesMap.has(key)) postcodesMap.set(key, new Set());
          postcodesMap.get(key)!.add('1229');
        }
        if (!dhakaMetroThanas.has('Airport')) {
          dhakaMetroThanas.add('Airport');
          const key = 'Dhaka Metro_Airport';
          if (!postcodesMap.has(key)) postcodesMap.set(key, new Set());
          postcodesMap.get(key)!.add('1229');
        }
      }

      hierarchy.divisions = Array.from(divisionsSet).sort();
      for (const [div, dists] of districtsMap.entries()) {
        hierarchy.districts[div] = Array.from(dists).sort();
      }
      for (const [dist, thanas] of thanasMap.entries()) {
        hierarchy.thanas[dist] = Array.from(thanas).sort();
      }
      for (const [key, codes] of postcodesMap.entries()) {
        hierarchy.postcodes[key] = Array.from(codes).sort();
      }

      // Write to public/files/locations-hierarchy.json
      const filePath = path.join(process.cwd(), "public", "files", "locations-hierarchy.json");
      fs.writeFileSync(filePath, JSON.stringify(hierarchy));

      return NextResponse.json({
        message: "Successfully synchronized locations with Steadfast",
        divisions: hierarchy.divisions.length,
        districts: Object.keys(hierarchy.districts).reduce((acc, k) => acc + hierarchy.districts[k].length, 0),
        thanas: Object.keys(hierarchy.thanas).reduce((acc, k) => acc + hierarchy.thanas[k].length, 0),
      });
    } else {
      console.error("Failed to fetch locations from Steadfast:", body);
      return NextResponse.json({
        error: body.message || "Failed to fetch locations from Steadfast",
        details: body
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Sync Steadfast locations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
