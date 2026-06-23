'use client';

import { usePathname } from 'next/navigation';
import NavigationDock from "@/components/NavigationDock";
import AdInfo from "@/components/AdInfo";
import GlobalAds from "@/components/GlobalAds";
import SuggestionBox from "@/components/SuggestionBox";

export default function ConditionalLayoutElements() {
  const pathname = usePathname();

  // Hide ads and docks on the admin page
  if (pathname?.startsWith('/forabook')) {
    return null;
  }

  return (
    <>
      <NavigationDock />
      <SuggestionBox />
      <AdInfo />
      <GlobalAds />
    </>
  );
}
