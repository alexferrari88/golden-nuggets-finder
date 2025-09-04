import * as fs from "node:fs";
import * as path from "node:path";

interface TestConfig {
	geminiApiKey: string;
	useRealAPI: boolean;
}

/**
 * Load test configuration from environment variables
 * Safely handles missing .env file and missing API key
 */
export function loadTestConfig(): TestConfig {
	// Try to load .env file if it exists
	const envPath = path.join(process.cwd(), ".env");
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, "utf-8");
		const envLines = envContent.split("\n");

		for (const line of envLines) {
			const [key, value] = line.split("=");
			if (key && value && key.trim() === "GEMINI_API_KEY") {
				process.env.GEMINI_API_KEY = value.trim();
				break;
			}
		}
	}

	const geminiApiKey = process.env.GEMINI_API_KEY || "test-api-key-mock";
	const useRealAPI = Boolean(
		process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 0,
	);

	return {
		geminiApiKey,
		useRealAPI,
	};
}

/**
 * Check if we can run tests that require real API calls
 */
export function canRunRealAPITests(): boolean {
	const config = loadTestConfig();
	return config.useRealAPI;
}

/**
 * Get API key for testing, with fallback
 */
export function getTestApiKey(): string {
	const config = loadTestConfig();
	return config.geminiApiKey;
}
