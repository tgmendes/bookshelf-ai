import { ImportZone } from '@/components/ImportZone';
import { FetchCoversButton } from '@/components/FetchCoversButton';
import { Settings, Image } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-foreground mb-2">Settings</h1>
      <p className="text-muted mb-8">Manage your library and data</p>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Re-import Goodreads Library</h2>
            <p className="text-sm text-muted mt-1">
              Re-import your Goodreads CSV to sync new books. Existing entries are updated,
              not duplicated.
            </p>
          </div>
        </div>

        <ImportZone />

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">How to export from Goodreads</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted">
            <li>Go to <strong className="text-foreground">goodreads.com</strong> and sign in</li>
            <li>Click <strong className="text-foreground">My Books</strong> in the top navigation</li>
            <li>Scroll to the bottom of the left sidebar and click <strong className="text-foreground">Import and Export</strong></li>
            <li>Click <strong className="text-foreground">Export Library</strong></li>
            <li>Download the CSV file and drop it above</li>
          </ol>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 mt-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
            <Image className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Fetch Book Covers</h2>
            <p className="text-sm text-muted mt-1">
              Fetch cover images and synopses for imported books from Google Books and Open Library.
              Processes up to 10 books per batch.
            </p>
          </div>
        </div>

        <FetchCoversButton />
      </div>
    </div>
  );
}
