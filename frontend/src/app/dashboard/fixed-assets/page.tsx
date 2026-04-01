'use client';

import FixedAssetsList from '@/components/fixed-assets/asset-list';

export default function FixedAssetsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fixed Assets</h1>
        <p className="text-muted-foreground">
          Manage your company's fixed assets, track depreciation, and generate reports
        </p>
      </div>
      <FixedAssetsList />
    </div>
  );
}
