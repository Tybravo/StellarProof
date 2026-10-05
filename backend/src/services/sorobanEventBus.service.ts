export type IngestedSorobanEvent =
  | {
      kind: "verificationRequest";
      eventId: string;
      ledger: number;
      transactionHash: string;
      requestId?: string;
      contentHash?: string;
      state?: string;
    }
  | {
      kind: "attestation";
      eventId: string;
      ledger: number;
      transactionHash: string;
      requestId?: string;
      manifestHash?: string;
      attestationHash?: string;
    }
  | {
      kind: "certificateMinted";
      eventId: string;
      ledger: number;
      transactionHash: string;
      requestId?: string;
      manifestHash?: string;
      certificateId: string;
    }
  | {
      kind: "registry";
      name: "teehashadded" | "teehashremoved" | "provideradded" | "providerremoved";
      eventId: string;
      ledger: number;
      transactionHash: string;
      payload: Record<string, unknown>;
    };

export type SorobanEventSubscriber = (
  event: IngestedSorobanEvent
) => Promise<boolean | void> | boolean | void;

export interface SorobanEventBus {
  publish(event: IngestedSorobanEvent): Promise<number>;
  subscribe(subscriber: SorobanEventSubscriber): () => void;
}

class InternalSorobanEventBus implements SorobanEventBus {
  private readonly subscribers = new Set<SorobanEventSubscriber>();

  subscribe(subscriber: SorobanEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  async publish(event: IngestedSorobanEvent): Promise<number> {
    let handled = 0;
    for (const subscriber of this.subscribers) {
      if ((await subscriber(event)) === true) handled += 1;
    }
    return handled;
  }
}

export const sorobanEventBus: SorobanEventBus = new InternalSorobanEventBus();
