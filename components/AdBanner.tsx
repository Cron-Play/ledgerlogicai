import React from 'react';
import { Platform, View } from 'react-native';

// Only render on Android
let BannerAdComponent: React.ComponentType<any> | null = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS === 'android') {
  try {
    const ads = require('react-native-google-mobile-ads');
    BannerAdComponent = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch (e) {
    // not available
  }
}

const AD_UNIT_ID = 'ca-app-pub-9075835145391390/7414280108';

export function AdBanner() {
  if (Platform.OS !== 'android' || !BannerAdComponent) {
    return null;
  }

  const Comp = BannerAdComponent;

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <Comp
        unitId={AD_UNIT_ID}
        size={BannerAdSize?.BANNER ?? 'BANNER'}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => console.log('[AdBanner] Ad loaded')}
        onAdFailedToLoad={(error: any) => console.warn('[AdBanner] Ad failed to load:', error)}
      />
    </View>
  );
}
