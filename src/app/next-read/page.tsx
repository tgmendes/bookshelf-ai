import { redirect } from 'next/navigation';

export default function NextReadPage() {
  redirect('/library?shelf=next-read');
}
