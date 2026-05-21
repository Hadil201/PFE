import SoccerActions from "./actions-enum";

// spotting
const spot = (video: string, duration: number = 5) => {
    const actionValues = Object.values(SoccerActions);
    const detectedActions = [];

    // 1. Determine if this video has actions (always true for simulation)
    const hasActions = true;

    if (hasActions) {
        // 2. Determine how many actions (1 to 3)
        const actionCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < actionCount; i++) {
            // Pick a random action from the Enum
            const randomAction = actionValues[Math.floor(Math.random() * actionValues.length)];

            // Random start time within duration
            const start = Math.random() * (duration - 1);
            // Action lasts 0.5 to 2 seconds, but capped at duration
            const end = Math.min(start + 0.5 + Math.random() * 1.5, duration);

            detectedActions.push({
                id: `event-${Date.now()}-${i}`,
                label: randomAction,
                start: parseFloat(start.toFixed(2)),
                end: parseFloat(end.toFixed(2)),
                confidence: parseFloat(Math.random().toFixed(2))
            });
        }
    }

    return {
        success: true,
        message: hasActions ? `Detected ${detectedActions.length} actions` : "No actions detected",
        data: {
            videoPath: video,
            detectedActions: detectedActions, // Array of 1-3 actions (or empty)
            processingTime: Math.random() * 2.5, // Mock processing time in seconds
            modelVersion: "v1.0-mock-random",
            duration: duration
        }
    };
};

// summarization
const summarize = (video: string) => {
    const summaries = [
        "Le match a été marqué par une domination territoriale de l'équipe à domicile, avec plusieurs occasions franches en première période. La seconde mi-temps a vu un regain de forme des visiteurs, mais la défense est restée solide.",
        "Une rencontre intense avec beaucoup de duels au milieu de terrain. Les deux buts marqués en fin de match reflètent l'engagement physique des deux équipes jusqu'au coup de sifflet final.",
        "Analyse tactique : Utilisation efficace des ailes pour déstabiliser le bloc adverse. La possession de balle a été largement en faveur de l'équipe victorieuse (65%)."
    ];
    
    return {
        success: true,
        message: "Video summarization completed",
        data: {
            videoPath: video,
            summary: summaries[Math.floor(Math.random() * summaries.length)],
            keyEvents: [],
            processingTime: Math.random() * 3.5,
            modelVersion: "v1.0-mock-summary"
        }
    };
};

export {
    spot,
    summarize,
};

