import React from 'react';
import { Helmet } from 'react-helmet-async';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSEOProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbSEO: React.FC<BreadcrumbSEOProps> = ({ items }) => {
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(breadcrumbList)}</script>
    </Helmet>
  );
};
