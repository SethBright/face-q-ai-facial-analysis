export type Tier = 'Legendary Chad' | 'Demigod Chad' | 'Gigachad' | 'Chad' | 'Chadlite' | 'HTN' | 'Upper Normie' | 'Mid-Tier Normie' | 'LTN' | 'Bottomcel' | 'Truecel' | 'Subhuman';

export interface RankResult {
    score: number;
    psl: number;
    tier: Tier;
    details?: {
        harmony: number;
        dimorphism: number;
        angularity: number;
        skin: number;
    };
}

export interface LeaderboardEntry extends RankResult {
    rank: number;
    displayName: string;
    avatarUrl: string;
}

export function calculateRank(rawScore: number): RankResult {
    const psl = 1 + 7 * (rawScore / 100);

    let tier: Tier = 'Subhuman';
    if (psl >= 6.0) tier = 'Chad';
    else if (psl >= 5.5) tier = 'Chadlite';
    else if (psl >= 5.0) tier = 'HTN';
    else if (psl >= 4.5) tier = 'Mid-Tier Normie'; // MTN equivalent
    else if (psl >= 3.5) tier = 'LTN';
    else tier = 'Subhuman';

    return {
        score: Math.round(rawScore),
        psl: Number(psl.toFixed(2)),
        tier,
        details: {
            harmony: Math.floor(rawScore * 0.9 + Math.random() * 10),
            dimorphism: Math.floor(rawScore * 0.8 + Math.random() * 20),
            angularity: Math.floor(rawScore * 0.95 + Math.random() * 5),
            skin: Math.floor(rawScore * 0.85 + Math.random() * 15)
        }
    };
}

export async function rankFace(base64Image: string): Promise<RankResult> {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (res.ok) {
            const data = await res.json();
            return {
                score: data.score,
                psl: data.psl,
                tier: data.tier as Tier,
                details: data.details
            };
        } else {
            const err = await res.json();
            console.error("Backend validation failed:", err.error);
            throw new Error(err.error || "Failed to analyze face");
        }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to reach backend";
        console.error("Failed to reach backend:", e);
        throw new Error(message);
    }
}

export const MOCK_LEADERBOARD_DAILY: LeaderboardEntry[] = Array.from({ length: 50 }).map((_, i) => {
    const score = 95 - Math.floor(i * 1.5) - Math.floor(Math.random() * 3);
    return {
        rank: i + 1,
        displayName: `User_${Math.floor(Math.random() * 10000)}`,
        avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
        ...calculateRank(Math.max(10, score))
    };
});
