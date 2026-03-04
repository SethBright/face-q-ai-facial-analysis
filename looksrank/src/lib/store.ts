import { create } from 'zustand';
import { supabase } from './supabase';

export type Tab = 'rank' | 'leaderboard' | 'duel' | 'inbox';

export interface Challenge {
    id: string;
    challenger_id: string;
    target_id: string;
    wager: number;
    status: 'pending' | 'completed' | 'declined';
    winner_id: string | null;
    created_at: string;
    profiles?: {
        username: string;
        best_today: number;
    };
}

interface AppState {
    isInitialized: boolean;
    userId: string | null;
    activeTab: Tab;
    displayName: string | null;
    coins: number;
    bestToday: number;
    bestWeekly: number;
    bestAllTime: number;
    setDisplayName: (name: string) => void;
    setActiveTab: (tab: Tab) => void;
    addCoins: (amount: number) => Promise<void>;
    deductCoins: (amount: number) => Promise<void>;
    updateBestScores: (score: number) => Promise<void>;
    initializeAuth: () => Promise<void>;
    createProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
    challenges: Challenge[];
    fetchChallenges: () => Promise<void>;
    subscribeToChallenges: () => () => void;
    lastViewedInbox: string | null;
    markInboxAsRead: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    isInitialized: false,
    userId: null,
    activeTab: 'rank',
    displayName: null,
    coins: 20, // Starter coins
    bestToday: 0,
    bestWeekly: 0,
    bestAllTime: 0,
    setDisplayName: (name) => set({ displayName: name }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    addCoins: async (amount) => {
        const state = get();
        const newTotal = state.coins + amount;
        set({ coins: newTotal });
        if (state.userId) {
            await supabase.from('profiles').update({ coins: newTotal }).eq('id', state.userId);
        }
    },
    deductCoins: async (amount) => {
        const state = get();
        const newTotal = Math.max(0, state.coins - amount);
        set({ coins: newTotal });
        if (state.userId) {
            await supabase.from('profiles').update({ coins: newTotal }).eq('id', state.userId);
        }
    },
    updateBestScores: async (score) => {
        const state = get();
        const newToday = Math.max(state.bestToday, score);
        const newWeekly = Math.max(state.bestWeekly, score);
        const newAllTime = Math.max(state.bestAllTime, score);
        set({ bestToday: newToday, bestWeekly: newWeekly, bestAllTime: newAllTime });

        if (state.userId) {
            await supabase.from('profiles').update({
                best_today: newToday,
                best_weekly: newWeekly,
                best_all_time: newAllTime
            }).eq('id', state.userId);
        }
    },
    challenges: [],
    fetchChallenges: async () => {
        const state = get();
        if (!state.userId) return;

        // Fetch received challenges (where we are the target)
        const { data: received, error: rError } = await supabase
            .from('challenges')
            .select('*, profiles!challenges_challenger_id_fkey(username, best_today)')
            .eq('target_id', state.userId)
            .order('created_at', { ascending: false });

        // Fetch sent challenges (where we are the challenger)
        const { data: sent, error: sError } = await supabase
            .from('challenges')
            .select('*, profiles!challenges_target_id_fkey(username, best_today)')
            .eq('challenger_id', state.userId)
            .order('created_at', { ascending: false });

        if (!rError && !sError) {
            // Merge and sort by created_at desc
            const all = [...(received || []), ...(sent || [])].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            set({ challenges: all });
        }
    },
    subscribeToChallenges: () => {
        const state = get();
        if (!state.userId) return () => { };

        const channel = supabase
            .channel(`challenges-realtime`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'challenges'
            }, () => {
                get().fetchChallenges();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    },
    lastViewedInbox: localStorage.getItem('lastViewedInbox'),
    markInboxAsRead: () => {
        const now = new Date().toISOString();
        localStorage.setItem('lastViewedInbox', now);
        set({ lastViewedInbox: now });
    },
    initializeAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            // Load their profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                set({
                    userId: session.user.id,
                    displayName: profile.username,
                    coins: profile.coins,
                    bestToday: profile.best_today || 0,
                    bestWeekly: profile.best_weekly || 0,
                    bestAllTime: profile.best_all_time || 0,
                    isInitialized: true
                });
            }
        }
        set({ isInitialized: true });
    },
    createProfile: async (name: string) => {
        try {
            // Use Anonymous Sign-In for the most frictionless experience.
            // Note: User must enable 'Allow Anonymous Sign-ins' in Supabase Dashboard -> Auth -> Providers
            let { data: authData, error: fetchError } = await supabase.auth.signInAnonymously();

            if (fetchError) {
                // If Anonymous sign-in is disabled, fallback to a more "valid" looking fake email
                if (fetchError.message.toLowerCase().includes('disabled')) {
                    const fakeEmail = `user-${Math.random().toString(36).substring(2, 11)}@example.com`;
                    const fakePassword = Math.random().toString(36).substring(2, 11);
                    const { data: retryData, error: retryError } = await supabase.auth.signUp({
                        email: fakeEmail,
                        password: fakePassword,
                    });
                    if (retryError) throw retryError;
                    authData = retryData;
                } else {
                    throw fetchError;
                }
            }

            if (!authData?.user) throw new Error("Failed to create user");

            // Create profile
            const { error: profileError } = await supabase.from('profiles').insert({
                id: authData.user.id,
                username: name,
                coins: 20,
                best_today: 0,
                best_weekly: 0,
                best_all_time: 0
            });

            if (profileError) {
                // E.g. unique constraint violation
                return { success: false, error: profileError.message };
            }

            set({
                userId: authData.user.id,
                displayName: name,
                coins: 20,
                bestToday: 0,
                bestWeekly: 0,
                bestAllTime: 0
            });

            return { success: true };
        } catch (error: unknown) {
            return { success: false, error: (error as Error).message || 'Unknown error occurred' };
        }
    }
}));
