import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { CircleCampaignSetting, AdminActivity } from '@/lib/models';
import { getAuthUserFromRequest, hasAnyRole } from '@/lib/api-auth';
import { ROLES } from '@/lib/constants';

export async function GET(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    let setting = await CircleCampaignSetting.findOne({ key: 'circle_campaign' }).lean();
    if (!setting) {
      setting = await CircleCampaignSetting.create({
        key: 'circle_campaign',
        isActive: true,
        discountPercent: 10,
        partnerUrl: 'https://circlenetworkbd.net/',
        updatedBy: user.email
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error fetching admin circle settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getAuthUserFromRequest(req as any);
    if (!user || !hasAnyRole(user, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MODERATOR])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isActive, discountPercent, partnerUrl } = await req.json();

    if (discountPercent === undefined || isNaN(Number(discountPercent)) || Number(discountPercent) < 0 || Number(discountPercent) > 100) {
      return NextResponse.json({ error: 'Discount percent must be a number between 0 and 100' }, { status: 400 });
    }

    await connectDB();

    const updatedSetting = await CircleCampaignSetting.findOneAndUpdate(
      { key: 'circle_campaign' },
      {
        $set: {
          isActive: Boolean(isActive),
          discountPercent: Number(discountPercent),
          partnerUrl: partnerUrl?.trim() || 'https://circlenetworkbd.net/',
          updatedBy: user.email
        }
      },
      { upsert: true, new: true }
    );

    // Audit log activity
    await AdminActivity.create({
      adminEmail: user.email,
      action: 'update_circle_campaign_setting',
      targetName: 'Circle Network Campaign',
      details: `Set Active: ${isActive}, Percent: ${discountPercent}%, Partner URL: ${partnerUrl}`
    });

    return NextResponse.json({
      message: 'Circle Network campaign settings updated successfully',
      setting: updatedSetting
    });
  } catch (error) {
    console.error('Error updating circle campaign settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
