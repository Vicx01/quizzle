/**
 * Quizzle — App root (prototype).
 *
 * Wraps the app in ThemeProvider (light/dark/system) and renders the
 * tab bar with the Generate screen active. Other tabs are placeholders
 * pending owner review of the prototype.
 */

import React, { useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { TabBar } from './components/TabBar';
import { GenerateScreen } from './screens/Generate';

type TabKey = 'generate' | 'history' | 'share' | 'account';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'generate', label: 'Generate' },
  { key: 'history', label: 'History' },
  { key: 'share', label: 'Share' },
  { key: 'account', label: 'Account' },
];

function PlaceholderScreen({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 32 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
        {label} screen — placeholder (not yet implemented)
      </Text>
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('generate');

  const isGenerate = activeTab === 'generate';

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="auto" />
        {isGenerate ? (
          <GenerateScreen
            onTabChange={(key) => setActiveTab(key as TabKey)}
          />
        ) : (
          <PlaceholderScreen label={activeTab} />
        )}
      </View>
    </ThemeProvider>
  );
}
