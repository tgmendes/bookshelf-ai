import { NextRequest, NextResponse } from 'next/server';
import { fetchBookData } from '@/lib/fetchBookData';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') ?? '';
  const author = searchParams.get('author') ?? '';

  const data = await fetchBookData(title, author);
  return NextResponse.json(data);
}
