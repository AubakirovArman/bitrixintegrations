import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const funnelId = searchParams.get('funnelId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!funnelId) {
      return NextResponse.json(
        { error: 'Funnel ID is required' },
        { status: 400 }
      );
    }

    // Получаем проект с Bitrix webhook URL
    const project = await db.project.findUnique({
      where: { id: projectId }
    });

    if (!project || !(project as any).bitrixWebhookUrl) {
      return NextResponse.json(
        { error: 'Bitrix webhook URL не настроен для этого проекта' },
        { status: 400 }
      )
    }

    // Запрос к Bitrix API для получения этапов воронки
    const bitrixUrl = `${(project as any).bitrixWebhookUrl}crm.status.list?filter[ENTITY_ID]=DEAL_STAGE&filter[CATEGORY_ID]=${funnelId}`;
    
    const response = await fetch(bitrixUrl);
    
    if (!response.ok) {
      throw new Error(`Bitrix API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      return NextResponse.json(
        { error: 'Invalid response from Bitrix API' },
        { status: 500 }
      );
    }

    // Форматируем этапы
    const stages = data.result.map((status: any) => ({
      id: status.STATUS_ID,
      name: status.NAME,
      sort: parseInt(status.SORT)
    }));

    // Сортируем этапы по порядку
    stages.sort((a: any, b: any) => a.sort - b.sort);

    return NextResponse.json({ stages });

  } catch (error) {
    console.error('Error fetching Bitrix stages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stages from Bitrix' },
      { status: 500 }
    );
  }
}