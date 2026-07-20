import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { CircleCampaignSetting } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    let setting = await CircleCampaignSetting.findOne({ key: 'circle_campaign' }).lean();
    if (!setting) {
      setting = {
        key: 'circle_campaign',
        isActive: true,
        discountPercent: 10,
        partnerUrl: 'https://circlenetworkbd.net/'
      };
    }

    return NextResponse.json({
      isActive: Boolean(setting.isActive),
      discountPercent: Number(setting.discountPercent) || 10,
      partnerUrl: setting.partnerUrl || 'https://circlenetworkbd.net/'
    });
  } catch (error) {
    console.error('Error fetching circle campaign settings:', error);
    return NextResponse.json({
      isActive: true,
      discountPercent: 10,
      partnerUrl: 'https://circlenetworkbd.net/'
    });
  }
}
