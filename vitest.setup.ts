import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Fake IndexedDB для unit тестов
import "fake-indexeddb/auto";

afterEach(() => {
	cleanup();
});
