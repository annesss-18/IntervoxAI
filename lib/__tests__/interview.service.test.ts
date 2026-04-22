import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.FEEDBACK_MODEL ??= "test-model";

const {
  findByUserIdPaginatedMock,
  findSessionByIdMock,
  updateInterviewMock,
  findManyByIdsMock,
  findTemplateByIdMock,
  findPublicMock,
  findByCreatorIdMock,
  updateAvgScoreMock,
  createFeedbackMock,
  findFeedbackByInterviewIdMock,
} = vi.hoisted(() => ({
  findByUserIdPaginatedMock: vi.fn(),
  findSessionByIdMock: vi.fn(),
  updateInterviewMock: vi.fn(),
  findManyByIdsMock: vi.fn(),
  findTemplateByIdMock: vi.fn(),
  findPublicMock: vi.fn(),
  findByCreatorIdMock: vi.fn(),
  updateAvgScoreMock: vi.fn(),
  createFeedbackMock: vi.fn(),
  findFeedbackByInterviewIdMock: vi.fn(),
}));

vi.mock("@/lib/repositories/interview.repository", () => ({
  InterviewRepository: {
    findByUserIdPaginated: findByUserIdPaginatedMock,
    findById: findSessionByIdMock,
    update: updateInterviewMock,
  },
}));

vi.mock("@/lib/repositories/template.repository", () => ({
  TemplateRepository: {
    findById: findTemplateByIdMock,
    findManyByIds: findManyByIdsMock,
    findPublic: findPublicMock,
    findByCreatorId: findByCreatorIdMock,
    updateAvgScore: updateAvgScoreMock,
  },
}));

vi.mock("@/lib/repositories/feedback.repository", () => ({
  FeedbackRepository: {
    create: createFeedbackMock,
    findByInterviewId: findFeedbackByInterviewIdMock,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn()),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

describe("InterviewService.getUserSessionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the embedded template snapshot without refetching templates", async () => {
    findByUserIdPaginatedMock.mockResolvedValue({
      sessions: [
        {
          id: "session-1",
          templateId: "template-1",
          status: "completed",
          startedAt: "2026-04-05T10:00:00.000Z",
          completedAt: "2026-04-05T10:30:00.000Z",
          finalScore: 86,
          feedbackId: "feedback-1",
          hasResume: true,
          templateSnapshot: {
            role: "Senior Backend Engineer",
            companyName: "Acme",
            companyLogoUrl: "https://example.com/logo.png",
            level: "Senior",
            type: "Technical",
            techStack: ["Node.js", "PostgreSQL"],
          },
        },
      ],
      nextCursor: null,
    });
    findManyByIdsMock.mockResolvedValue(new Map());

    const { InterviewService } =
      await import("@/lib/services/interview.service");
    const result = await InterviewService.getUserSessionsPage("user-1");

    expect(findManyByIdsMock).not.toHaveBeenCalled();
    expect(result.sessions).toEqual([
      {
        id: "session-1",
        role: "Senior Backend Engineer",
        companyName: "Acme",
        companyLogoUrl: "https://example.com/logo.png",
        level: "Senior",
        type: "Technical",
        techStack: ["Node.js", "PostgreSQL"],
        status: "completed",
        startedAt: "2026-04-05T10:00:00.000Z",
        completedAt: "2026-04-05T10:30:00.000Z",
        finalScore: 86,
        feedbackId: "feedback-1",
        hasResume: true,
      },
    ]);
  });

  it("fetches only templates missing from legacy sessions", async () => {
    findByUserIdPaginatedMock.mockResolvedValue({
      sessions: [
        {
          id: "session-new",
          templateId: "template-new",
          status: "active",
          startedAt: "2026-04-05T10:00:00.000Z",
          hasResume: false,
          templateSnapshot: {
            role: "Frontend Engineer",
            companyName: "Contoso",
            level: "Mid",
            type: "Behavioral",
            techStack: ["React"],
          },
        },
        {
          id: "session-legacy",
          templateId: "template-legacy",
          status: "completed",
          startedAt: "2026-04-04T10:00:00.000Z",
          finalScore: 74,
          feedbackId: "feedback-legacy",
          hasResume: true,
        },
      ],
      nextCursor: "session-legacy",
    });
    findManyByIdsMock.mockResolvedValue(
      new Map([
        [
          "template-legacy",
          {
            id: "template-legacy",
            role: "Platform Engineer",
            companyName: "Northwind",
            companyLogoUrl: undefined,
            level: "Staff",
            type: "System Design",
            techStack: ["Go", "Kafka"],
          },
        ],
      ]),
    );

    const { InterviewService } =
      await import("@/lib/services/interview.service");
    const result = await InterviewService.getUserSessionsPage("user-1");

    expect(findManyByIdsMock).toHaveBeenCalledWith(["template-legacy"]);
    expect(result.nextCursor).toBe("session-legacy");
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]?.role).toBe("Frontend Engineer");
    expect(result.sessions[1]?.role).toBe("Platform Engineer");
  });
});

describe("InterviewService.getSessionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to the stored template snapshot when the template was deleted", async () => {
    findSessionByIdMock.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      templateId: "template-1",
      startedAt: "2026-04-05T10:00:00.000Z",
      status: "completed",
      transcript: [
        { role: "assistant", content: "Walk me through your approach." },
      ],
      durationMinutes: 60,
      resumeText: "resume text",
      finalScore: 91,
      feedbackId: "feedback-1",
      templateSnapshot: {
        role: "Senior Data Engineer",
        companyName: "Acme",
        companyLogoUrl: "https://example.com/logo.png",
        level: "Senior",
        type: "Technical",
        techStack: ["Python", "Spark"],
      },
    });
    findTemplateByIdMock.mockResolvedValue(null);

    const { InterviewService } =
      await import("@/lib/services/interview.service");
    const result = await InterviewService.getSessionById("session-1", "user-1");

    expect(result).toEqual({
      id: "session-1",
      userId: "user-1",
      templateId: "template-1",
      createdAt: "2026-04-05T10:00:00.000Z",
      status: "completed",
      transcript: [
        { role: "assistant", content: "Walk me through your approach." },
      ],
      durationMinutes: 60,
      resumeText: "resume text",
      finalScore: 91,
      feedbackId: "feedback-1",
      role: "Senior Data Engineer",
      companyName: "Acme",
      companyLogoUrl: "https://example.com/logo.png",
      level: "Senior",
      questions: [],
      techStack: ["Python", "Spark"],
      jobDescription: "",
      type: "Technical",
      systemInstruction: undefined,
      interviewerPersona: undefined,
      focusArea: [],
    });
  });
});

describe("InterviewService.getPublicTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the requested sort order through to the repository", async () => {
    findPublicMock.mockResolvedValue([
      {
        id: "template-1",
        role: "Backend Engineer",
        companyName: "Acme",
        companyLogoUrl: undefined,
        level: "Mid",
        type: "Technical",
        techStack: ["Node.js"],
        usageCount: 12,
        avgScore: 84,
        createdAt: "2026-04-01T10:00:00.000Z",
      },
    ]);

    const { InterviewService } =
      await import("@/lib/services/interview.service");
    const result = await InterviewService.getPublicTemplates(5, "popular");

    expect(findPublicMock).toHaveBeenCalledWith(5, "popular");
    expect(result).toEqual([
      {
        id: "template-1",
        role: "Backend Engineer",
        companyName: "Acme",
        companyLogoUrl: undefined,
        level: "Mid",
        type: "Technical",
        techStack: ["Node.js"],
        usageCount: 12,
        avgScore: 84,
        createdAt: "2026-04-01T10:00:00.000Z",
        isOwnedByUser: false,
      },
    ]);
  });
});
