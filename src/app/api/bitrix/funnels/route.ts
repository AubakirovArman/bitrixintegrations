import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
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

    const bitrixUrl = `${(project as any).bitrixWebhookUrl}crm.status.list.json`
    
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

    // Группируем статусы по воронкам
    const funnels: { [key: string]: { id: string; name: string; stages: any[] } } = {};
    
    data.result.forEach((status: any) => {
      const categoryId = status.CATEGORY_ID || '0';
      
      if (!funnels[categoryId]) {
        funnels[categoryId] = {
          id: categoryId,
          name: categoryId === '0' ? 'Основная воронка' : `Воронка ${categoryId}`,
          stages: []
        };
      }
      
      funnels[categoryId].stages.push({
        id: status.STATUS_ID,
        name: status.NAME,
        sort: status.SORT
      });
    });

    // Сортируем этапы в каждой воронке
    Object.values(funnels).forEach(funnel => {
      funnel.stages.sort((a, b) => parseInt(a.sort) - parseInt(b.sort));
    });

    return NextResponse.json({
      funnels: Object.values(funnels)
    });

  } catch (error) {
    console.error('Error fetching Bitrix funnels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnels from Bitrix' },
      { status: 500 }
    );
  }
}