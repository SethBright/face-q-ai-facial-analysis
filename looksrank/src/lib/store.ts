import { create } from 'zustand';
import { supabase } from './supabase';

export type Tab = 'rank' | 'leaderboard' | 'duel' | 'inbox';

export interface Challenge {
    id: string;
    challenger_id: string;
    target_id: string;
    wager: number;
    challenger_score: number | null;
    challenger_image_url: string | null;
    status: 'pending' | 'completed' | 'declined';
    winner_id: string | null;
    created_at: string;
    profiles?: {
        id: string;
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
    avatarUrl: string | null;
    setDisplayName: (name: string) => void;
    setActiveTab: (tab: Tab) => void;
    addCoins: (amount: number) => Promise<void>;
    deductCoins: (amount: number) => Promise<void>;
    updateBestScores: (result: { score: number, psl: number, tier: string }, image?: string) => Promise<void>;
    initializeAuth: () => Promise<void>;
    signUp: (handle: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logIn: (handle: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logOut: () => Promise<void>;
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
    coins: 20,
    bestToday: 0,
    bestWeekly: 0,
    bestAllTime: 0,
    avatarUrl: null,
    setDisplayName: (name: string) => set({ displayName: name }),
    setActiveTab: (tab: Tab) => set({ activeTab: tab }),
    addCoins: async (amount: number) => {
        const state = get();
        const newTotal = (state.coins || 0) + amount;
        set({ coins: newTotal });
        if (state.userId) {
            await supabase.from('profiles').update({ coins: newTotal }).eq('id', state.userId);
        }
    },
    deductCoins: async (amount: number) => {
        const state = get();
        const newTotal = Math.max(0, (state.coins || 0) - amount);
        set({ coins: newTotal });
        if (state.userId) {
            await supabase.from('profiles').update({ coins: newTotal }).eq('id', state.userId);
        }
    },
    updateBestScores: async (result, image) => {
        const { score, psl, tier } = result;
        const state = get();
        const isNewHigh = score > state.bestAllTime;
        const newToday = Math.max(state.bestToday, score);
        const newWeekly = Math.max(state.bestWeekly, score);
        const newAllTime = Math.max(state.bestAllTime, score);

        let newAvatarUrl = state.avatarUrl;

        // If it's a new all-time high OR they don't have an avatar at all, upload it
        const shouldUpload = (isNewHigh || !newAvatarUrl) && image && state.userId;

        if (shouldUpload) {
            try {
                // Convert base64 to Blob
                const base64Data = image.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });

                const fileName = `${state.userId}_${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('selfies')
                    .upload(fileName, blob, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('selfies')
                    .getPublicUrl(fileName);

                newAvatarUrl = publicUrl;
            } catch (err) {
                console.error("Failed to upload selfie:", err);
            }
        }

        set({
            bestToday: newToday,
            bestWeekly: newWeekly,
            bestAllTime: newAllTime,
            avatarUrl: newAvatarUrl
        });

        if (state.userId) {
            // 1. Update Profile (for Leaderboard)
            await supabase.from('profiles').update({
                score: score,
                psl: psl,
                tier: tier,
                best_today: newToday,
                best_weekly: newWeekly,
                best_all_time: newAllTime,
                avatar_url: newAvatarUrl
            }).eq('id', state.userId);

            // 2. Log to Ranks (for History)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('ranks').insert({
                    user_id: user.id,
                    score: score,
                    psl: psl,
                    image_url: newAvatarUrl
                });
            }
        }
    },
    challenges: [],
    fetchChallenges: async () => {
        const state = get();
        if (!state.userId) return;

        // Fetch received challenges (where we are the target)
        const { data: received, error: rError } = await supabase
            .from('challenges')
            .select('*, profiles!challenges_challenger_id_fkey(id, best_today, avatar_url)')
            .eq('target_id', state.userId)
            .order('created_at', { ascending: false });

        // Fetch sent challenges (where we are the challenger)
        const { data: sent, error: sError } = await supabase
            .from('challenges')
            .select('*, profiles!challenges_target_id_fkey(id, best_today, avatar_url)')
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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("Session error:", error);

        if (session?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_id', session.user.id)
                .single();

            if (profile) {
                set({
                    userId: profile.id, // The handle
                    displayName: profile.id, // The handle
                    coins: profile.coins,
                    bestToday: profile.best_today || 0,
                    bestWeekly: profile.best_weekly || 0,
                    bestAllTime: profile.best_all_time || 0,
                    avatarUrl: profile.avatar_url,
                    isInitialized: true
                });
            }
        }
        set({ isInitialized: true });
    },

    // Authenticate using the phantom email trick
    signUp: async (handle: string, password: string) => {
        try {
            const phantomEmail = `${handle.toLowerCase()}@handles.looksrank.internal`;

            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: phantomEmail,
                password: password,
            });

            if (authError) throw new Error(authError.message);
            if (!authData?.user) throw new Error("Failed to create user account.");

            // 2. Create the associated public profile
            const { error: profileError } = await supabase.from('profiles').insert({
                id: handle, // The primary key is the handle
                auth_id: authData.user.id, // Link to the secure auth user
                coins: 20, // Starting balance
                best_today: 0,
                best_weekly: 0,
                best_all_time: 0
            });

            if (profileError) {
                // If profile creation fails (e.g. handle taken but auth email didn't exist yet, which shouldn't happen but just in case)
                throw new Error("Handle may already be taken, or database error.");
            }

            // 3. Update local state
            set({
                userId: handle,
                displayName: handle,
                coins: 20,
                bestToday: 0,
                bestWeekly: 0,
                bestAllTime: 0
            });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    },

    logIn: async (handle: string, password: string) => {
        try {
            const phantomEmail = `${handle.toLowerCase()}@handles.looksrank.internal`;

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: phantomEmail,
                password: password,
            });

            if (authError) {
                if (authError.message.includes("Invalid login credentials")) {
                    throw new Error("Incorrect password or handle does not exist.");
                }
                throw new Error(authError.message);
            }
            if (!authData?.user) throw new Error("Failed to log in.");

            // Profile will be loaded via onAuthStateChange in App.tsx, but we can load it here too for immediate UI response
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_id', authData.user.id)
                .single();

            if (profileError || !profile) {
                throw new Error("Could not load user profile.");
            }

            set({
                userId: profile.id,
                displayName: profile.id,
                coins: profile.coins,
                bestToday: profile.best_today || 0,
                bestWeekly: profile.best_weekly || 0,
                bestAllTime: profile.best_all_time || 0,
                avatarUrl: profile.avatar_url
            });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    },

    logOut: async () => {
        await supabase.auth.signOut();
        set({
            userId: null,
            displayName: null,
            coins: 0,
            bestToday: 0,
            bestWeekly: 0,
            bestAllTime: 0,
            avatarUrl: null
        });
    }
}));
