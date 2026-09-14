import { useEffect, useState } from "react";
import type { ImportedMscGoal } from "../../shared/msc-goal";
import type {
  ApprovedEvidence,
  EvidenceCandidate,
} from "../../shared/evidence";
import {
  initialWorkIQStatus,
  type WorkIQStatus,
} from "../../shared/workiq-status";

const statusLabels: Record<WorkIQStatus["state"], string> = {
  not_connected: "Not checked",
  connecting: "Connecting",
  connected: "Connected",
  setup_required: "Setup required",
  authentication_required: "Sign-in required",
  unavailable: "Unavailable",
  error: "Connection error",
};

const MSC_GOALS_URL =
  "https://msc.microsoft.com/Reports/79a67862-225c-4a3a-874e-1b08ec193e7d";

export default function App(): React.JSX.Element {
  const [status, setStatus] = useState<WorkIQStatus>(initialWorkIQStatus);
  const [mscState, setMscState] = useState<
    "not_connected" | "connecting" | "connected" | "error"
  >("not_connected");
  const [mscMessage, setMscMessage] = useState(
    "Microsoft role goals have not been connected yet.",
  );
  const [isConnectingServices, setIsConnectingServices] = useState(false);
  const [goalsMessage, setGoalsMessage] = useState("");
  const [isImportingGoals, setIsImportingGoals] = useState(false);
  const [importedGoals, setImportedGoals] = useState<ImportedMscGoal[]>([]);
  const [evidenceCandidates, setEvidenceCandidates] = useState<EvidenceCandidate[]>([]);
  const [approvedEvidence, setApprovedEvidence] = useState<ApprovedEvidence[]>([]);
  const [evidenceStates, setEvidenceStates] = useState<
    Record<string, "pending" | "approved" | "rejected" | "clarification">
  >({});
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [isDiscoveringEvidence, setIsDiscoveringEvidence] = useState(false);
  useEffect(() => {
    void window.stride.getWorkIQStatus().then(setStatus);
    void window.stride.getRoleGoals().then((savedGoals) => {
      setImportedGoals(savedGoals);
      if (savedGoals.length > 0) {
        setMscState("connected");
        setMscMessage(
          `${savedGoals.length} saved role goal${savedGoals.length === 1 ? "" : "s"} available.`,
        );
      }
    });
    void window.stride.getApprovedEvidence().then(setApprovedEvidence);
  }, []);

  async function connectServices(): Promise<void> {
    setIsConnectingServices(true);
    setStatus({
      state: "connecting",
      message: "Starting WorkIQ...",
      tools: [],
      checkedAt: new Date().toISOString(),
    });
    setMscState("not_connected");
    setMscMessage("Waiting for WorkIQ...");

    try {
      const workiqStatus = await window.stride.connectWorkIQ();
      setStatus(workiqStatus);

      if (workiqStatus.state !== "connected") {
        setMscMessage("Complete WorkIQ setup before connecting Microsoft goals.");
        return;
      }

      setMscState("connecting");
      setMscMessage("Opening Microsoft role goals in managed Edge...");
      const goals = await window.stride.importGoalsFromMsc(MSC_GOALS_URL);
      setImportedGoals(goals);
      setMscState("connected");
      setMscMessage(
        `${goals.length} role goal${goals.length === 1 ? "" : "s"} available.`,
      );
      setGoalsMessage(
        `${goals.length} Microsoft goal${goals.length === 1 ? "" : "s"} imported. All goals are active.`,
      );
    } catch (error) {
      setMscState("error");
      setMscMessage(
        error instanceof Error ? error.message : "Microsoft goals could not be connected.",
      );
    } finally {
      setIsConnectingServices(false);
    }
  }

  async function importGoals(): Promise<void> {
    setIsImportingGoals(true);
    setGoalsMessage("");
    try {
      const goals = await window.stride.importGoalsFromMsc(MSC_GOALS_URL);
      setImportedGoals(goals);
      setMscState("connected");
      setMscMessage(
        `${goals.length} role goal${goals.length === 1 ? "" : "s"} available.`,
      );
      setGoalsMessage(
        `${goals.length} Microsoft goal${goals.length === 1 ? "" : "s"} imported. All goals are active.`,
      );
    } catch (error) {
      setGoalsMessage(
        error instanceof Error ? error.message : "Microsoft goals could not be imported.",
      );
      setMscState("error");
      setMscMessage(
        error instanceof Error ? error.message : "Microsoft goals could not be imported.",
      );
    } finally {
      setIsImportingGoals(false);
    }
  }

  async function discoverEvidence(): Promise<void> {
    const goalTitles = importedGoals.map((goal) => goal.title);

    if (goalTitles.length === 0) {
      setEvidenceMessage("Import your Microsoft Connect goals first.");
      return;
    }

    setIsDiscoveringEvidence(true);
    setEvidenceMessage("WorkIQ is finding factual evidence candidates...");
    try {
      const candidates = await window.stride.discoverEvidence({
        goalTitles,
        daysBack: 30,
      });
      setEvidenceCandidates(candidates);
      setEvidenceStates(
        Object.fromEntries(candidates.map((candidate) => [candidate.id, "pending"])),
      );
      setEvidenceMessage(
        `${candidates.length} evidence candidate${candidates.length === 1 ? "" : "s"} ready for your review.`,
      );
    } catch (error) {
      setEvidenceMessage(
        error instanceof Error ? error.message : "WorkIQ evidence discovery failed.",
      );
    } finally {
      setIsDiscoveringEvidence(false);
    }
  }

  function updateEvidenceCandidate(
    id: string,
    field: "contribution" | "outcome",
    value: string,
  ): void {
    setEvidenceCandidates((candidates) =>
      candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate,
      ),
    );
  }

  async function approveCandidate(candidate: EvidenceCandidate): Promise<void> {
    try {
      const approved = await window.stride.approveEvidence({
        candidate,
        employeeNotes: "",
        approvedForConnect: true,
      });
      setApprovedEvidence((current) => [
        approved,
        ...current.filter((item) => item.id !== approved.id),
      ]);
      setEvidenceStates((current) => ({ ...current, [candidate.id]: "approved" }));
      setEvidenceMessage("Evidence approved and saved to your local impact journal.");
    } catch (error) {
      setEvidenceMessage(
        error instanceof Error ? error.message : "Evidence could not be approved.",
      );
    }
  }

  function setCandidateState(
    id: string,
    state: "rejected" | "clarification",
  ): void {
    setEvidenceStates((current) => ({ ...current, [id]: state }));
    setEvidenceMessage(
      state === "rejected"
        ? "Evidence rejected. It was not saved."
        : "Evidence marked for clarification. It was not saved.",
    );
  }

  return (
    <main className="shell">
      <header className="header">
        <div className="brand-mark">S</div>
        <div>
          <strong>Stride</strong>
          <span>Your personal Microsoft growth and impact companion</span>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">MICROSOFT SERVICES</p>
          <h1>Connect Stride to Microsoft.</h1>
          <p className="hero-copy">
            One guided setup initializes WorkIQ, then opens Microsoft role goals
            in managed Edge so Microsoft Conditional Access remains enforced.
          </p>
        </div>

        <article className="status-card">
          <div className="service-heading">
            <p className="label">MICROSOFT CONNECTIONS</p>
            <h2>
              {status.state === "connected" && mscState === "connected"
                ? "Connected"
                : "Setup"}
            </h2>
          </div>

          <div className="service-list">
            <div className={`service-row status-${status.state}`}>
              <span className="status-dot" aria-hidden="true" />
              <div>
                <strong>WorkIQ</strong>
                <p>{statusLabels[status.state]} · {status.message}</p>
              </div>
            </div>
            <div className={`service-row status-${mscState}`}>
              <span className="status-dot" aria-hidden="true" />
              <div>
                <strong>Microsoft role goals</strong>
                <p>{mscMessage}</p>
              </div>
            </div>
          </div>

          {status.tools.length > 0 && (
            <div className="tools">
              <p className="label">AVAILABLE TOOLS</p>
              <div className="tool-list">
                {status.tools.map((tool) => (
                  <span key={tool}>{tool}</span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void connectServices()}
            disabled={isConnectingServices}
          >
            {isConnectingServices
              ? "Connecting Microsoft services..."
              : "Connect Microsoft services"}
          </button>
        </article>
      </section>

      <section className="principles">
        <article>
          <span>01</span>
          <h3>Secure boundary</h3>
          <p>WorkIQ and Node.js remain in the Electron main process.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Actionable setup</h3>
          <p>Employees see a clear status instead of a generic connection failure.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Local foundation</h3>
          <p>No Stride backend or Azure deployment is required.</p>
        </article>
      </section>

      <section className="priority-section">
        <div className="section-copy">
          <p className="eyebrow">MY CONNECT GOALS</p>
          <h2>Every imported goal is active.</h2>
          <p>
            Stride uses the complete set of imported Connect goals when finding
            evidence, coaching, and preparing future Connect content.
          </p>
          <div className="saved-summary">
            <span>ACTIVE CONNECT GOALS</span>
            <strong>{importedGoals.length}</strong>
            <small>All imported goals are included automatically.</small>
          </div>
        </div>

        <div className="priority-form">
          <div className="import-panel">
            <div>
              <strong>Microsoft role goals</strong>
              <span>Open the report in managed Edge, then import visible goal rows.</span>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void importGoals()}
              disabled={isImportingGoals}
            >
              {isImportingGoals ? "Refreshing..." : "Refresh MSC goals"}
            </button>
          </div>

          {importedGoals.length > 0 && (
            <div className="imported-goals">
              {importedGoals.map((goal) => (
                <article key={goal.title}>
                  <div>
                    <strong>{goal.title}</strong>
                    <p>{goal.description}</p>
                    {goal.metrics.length > 0 && (
                      <small>{goal.metrics.join(" · ")}</small>
                    )}
                  </div>
                  <span className="active-goal">Active</span>
                </article>
              ))}
            </div>
          )}

          <div className="form-actions">
            <span role="status">{goalsMessage}</span>
          </div>
        </div>
      </section>

      <section className="evidence-section">
        <div className="evidence-intro">
          <div>
            <p className="eyebrow">MY IMPACT</p>
            <h2>Find evidence connected to your goals.</h2>
            <p>
              WorkIQ searches recent meetings, emails, and documents for factual
              evidence candidates. Review and edit every item before approval.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void discoverEvidence()}
            disabled={isDiscoveringEvidence || status.state !== "connected"}
          >
            {isDiscoveringEvidence ? "Finding evidence..." : "Find recent evidence"}
          </button>
        </div>

        <p className="evidence-message" role="status">{evidenceMessage}</p>

        {evidenceCandidates.length > 0 && (
          <div className="evidence-grid">
            {evidenceCandidates.map((candidate) => {
              const candidateState = evidenceStates[candidate.id] ?? "pending";
              return (
                <article className={`evidence-card evidence-${candidateState}`} key={candidate.id}>
                  <div className="evidence-card-heading">
                    <div>
                      <span>{candidate.goalTitle}</span>
                      <h3>{candidate.activityTitle}</h3>
                    </div>
                    <strong>{candidate.confidence} confidence</strong>
                  </div>
                  <small>
                    {candidate.activityDate || "Date not confirmed"} · {candidate.sourceTitle}
                  </small>
                  <label>
                    Contribution
                    <textarea
                      rows={3}
                      value={candidate.contribution}
                      disabled={candidateState !== "pending"}
                      onChange={(event) =>
                        updateEvidenceCandidate(
                          candidate.id,
                          "contribution",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    Outcome
                    <textarea
                      rows={3}
                      value={candidate.outcome}
                      disabled={candidateState !== "pending"}
                      placeholder="Confirm or add the observable outcome."
                      onChange={(event) =>
                        updateEvidenceCandidate(
                          candidate.id,
                          "outcome",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <blockquote>{candidate.supportingExcerpt}</blockquote>
                  {candidate.uncertainties && (
                    <p className="uncertainty">
                      <strong>Confirm:</strong> {candidate.uncertainties}
                    </p>
                  )}
                  <div className="evidence-actions">
                    <span>{candidateState}</span>
                    <button
                      type="button"
                      disabled={candidateState !== "pending"}
                      onClick={() => void approveCandidate(candidate)}
                    >
                      Approve
                    </button>
                    <button
                      className="secondary-action"
                      type="button"
                      disabled={candidateState !== "pending"}
                      onClick={() => setCandidateState(candidate.id, "clarification")}
                    >
                      Needs clarification
                    </button>
                    <button
                      className="text-action"
                      type="button"
                      disabled={candidateState !== "pending"}
                      onClick={() => setCandidateState(candidate.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {approvedEvidence.length > 0 && (
          <div className="impact-journal">
            <p className="label">LOCAL IMPACT JOURNAL</p>
            <strong>
              {approvedEvidence.length} approved evidence item
              {approvedEvidence.length === 1 ? "" : "s"}
            </strong>
            <span>Only employee-approved evidence is stored here.</span>
          </div>
        )}
      </section>
    </main>
  );
}
