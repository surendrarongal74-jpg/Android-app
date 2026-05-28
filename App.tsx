import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useCoupleSpace } from './contexts/CoupleSpaceContext';

import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';

const ProfileSetupScreen = React.lazy(() => import('./screens/ProfileSetupScreen').then(m => ({ default: m.ProfileSetupScreen })));
const OnboardingScreen = React.lazy(() => import('./screens/OnboardingScreen').then(m => ({ default: m.OnboardingScreen })));
const ChatScreen = React.lazy(() => import('./screens/ChatScreen').then(m => ({ default: m.ChatScreen })));
const MemoriesScreen = React.lazy(() => import('./screens/MemoriesScreen').then(m => ({ default: m.MemoriesScreen })));
const GameScreen = React.lazy(() => import('./screens/GameScreen').then(m => ({ default: m.GameScreen })));
const LoveLanguageScreen = React.lazy(() => import('./screens/LoveLanguageScreen').then(m => ({ default: m.LoveLanguageScreen })));

const DailyNotesScreen = React.lazy(() => import('./screens/DailyNotesScreen').then(m => ({ default: m.DailyNotesScreen })));
const SurpriseSchedulerScreen = React.lazy(() => import('./screens/SurpriseSchedulerScreen').then(m => ({ default: m.SurpriseSchedulerScreen })));
const LoveMapScreen = React.lazy(() => import('./screens/LoveMapScreen').then(m => ({ default: m.LoveMapScreen })));
const DiaryScreen = React.lazy(() => import('./screens/DiaryScreen').then(m => ({ default: m.DiaryScreen })));
const TruthOrDareScreen = React.lazy(() => import('./screens/TruthOrDareScreen').then(m => ({ default: m.TruthOrDareScreen })));
const SmartRemindersScreen = React.lazy(() => import('./screens/SmartRemindersScreen').then(m => ({ default: m.SmartRemindersScreen })));
const SynergyQuizScreen = React.lazy(() => import('./screens/SynergyQuizScreen').then(m => ({ default: m.SynergyQuizScreen })));
const AIPlannerScreen = React.lazy(() => import('./screens/AIPlannerScreen').then(m => ({ default: m.AIPlannerScreen })));
const AiraScreen = React.lazy(() => import('./screens/AiraScreen').then(m => ({ default: m.AiraScreen })));
const NotificationsScreen = React.lazy(() => import('./screens/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const RelationshipPulseScreen = React.lazy(() => import('./screens/RelationshipPulseScreen').then(m => ({ default: m.RelationshipPulseScreen })));
const HeartSyncScreen = React.lazy(() => import('./screens/HeartSyncScreen').then(m => ({ default: m.HeartSyncScreen })));
const PhotoShareScreen = React.lazy(() => import('./screens/PhotoShareScreen').then(m => ({ default: m.PhotoShareScreen })));
const LoveverseScreen = React.lazy(() => import('./screens/LoveverseScreen').then(m => ({ default: m.LoveverseScreen })));
const RelationshipIntelligenceScreen = React.lazy(() => import('./screens/RelationshipIntelligenceScreen'));
const RelationshipRecapScreen = React.lazy(() => import('./screens/RelationshipRecapScreen').then(m => ({ default: m.RelationshipRecapScreen })));
const LoveCapsuleScreen = React.lazy(() => import('./screens/LoveCapsuleScreen').then(m => ({ default: m.LoveCapsuleScreen })));
const DreamWallScreen = React.lazy(() => import('./screens/DreamWallScreen').then(m => ({ default: m.DreamWallScreen })));

const LiveCanvasScreen = React.lazy(() => import('./screens/LiveCanvasScreen'));
const WatchTogetherScreen = React.lazy(() => import('./screens/WatchTogetherScreen').then(m => ({ default: m.WatchTogetherScreen })));

import { CallOverlay } from './components/CallOverlay';
import { NotificationToast } from './components/NotificationToast';

const LazyLoadingPlaceholder = () => (
  <div className="min-h-screen bg-[#FFF0F5] flex flex-col items-center justify-center p-6 text-center select-none">
    <div className="w-10 h-10 rounded-full border-4 border-[#FF668C] border-t-transparent animate-spin mb-4" />
    <p className="font-serif italic font-bold text-[#E8547A]">Entering Secret Sanctuary...</p>
    <p className="text-[10px] text-slate-400 mt-2 tracking-widest uppercase">Love Link AI</p>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-rose-50 flex items-center justify-center text-rose-300">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
}

function SpaceRoute({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const { space, loading } = useCoupleSpace();
  
  if (loading) return <div className="min-h-screen bg-rose-50 flex items-center justify-center text-rose-300">Loading...</div>;
  
  if (!userData?.coupleSpaceId || !space) {
    return <Navigate to="/onboarding" />;
  }
  
  return <>{children}</>;
}

function ActiveSpaceRoute({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const { space, partnerData, loading } = useCoupleSpace();
  
  if (loading) return <div className="min-h-screen bg-rose-50 flex items-center justify-center text-rose-300">Loading...</div>;
  
  if (!userData?.coupleSpaceId || !space) {
    return <Navigate to="/onboarding" />;
  }

  if (!partnerData) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-white max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-rose-100">
      <CallOverlay />
      <NotificationToast />
      <React.Suspense fallback={<LazyLoadingPlaceholder />}>
        <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        
        <Route path="/setup" element={
          <ProtectedRoute>
            <ProfileSetupScreen />
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationsScreen />
          </ProtectedRoute>
        } />

        <Route path="/pulse" element={
          <ProtectedRoute>
            <RelationshipPulseScreen />
          </ProtectedRoute>
        } />

        <Route path="/sync/canvas" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <LiveCanvasScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/sync/watch" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <WatchTogetherScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/sync/pulse" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <HeartSyncScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingScreen />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <SpaceRoute>
              <HomeScreen />
            </SpaceRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <ChatScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/memories" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <MemoriesScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/game" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <GameScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/lovelanguage" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <LoveLanguageScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/notes" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <DailyNotesScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/scheduler" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <SurpriseSchedulerScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/map" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <LoveMapScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/diary" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <DiaryScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/truth-or-dare" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <TruthOrDareScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/reminders" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <SmartRemindersScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/who-loves-more" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <SynergyQuizScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/aira" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <AiraScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/date-planner" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <AIPlannerScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/watch" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <WatchTogetherScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />
        
        <Route path="/draw" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <LiveCanvasScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/photos" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <PhotoShareScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/loveverse" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <LoveverseScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/intelligence" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <RelationshipIntelligenceScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/recap" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <RelationshipRecapScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/capsules" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <LoveCapsuleScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />

        <Route path="/dreams" element={
          <ProtectedRoute>
            <ActiveSpaceRoute>
              <DreamWallScreen />
            </ActiveSpaceRoute>
          </ProtectedRoute>
        } />
        </Routes>
      </React.Suspense>
    </div>
  );
}
