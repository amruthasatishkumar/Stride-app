import type { StrideApi } from "../../preload";

declare global {
  interface Window {
    stride: StrideApi;
  }
}

export {};

