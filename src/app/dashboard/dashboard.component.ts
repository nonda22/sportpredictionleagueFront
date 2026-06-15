import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import type {
  ContestDto,
  LeaderboardEntryDto,
  EventParticipantDto,
  ScoreLedgerEntryDto,
  ScorePairDto,
  UpcomingEventDto,
  UserSelectionDto,
  UserSelectionItemDto,
} from '../models';
import { ScoringService } from '../scoring.service';
import { ContestsService } from '../team-selection/contests.service';
import { UserSelectionsService } from '../team-selection/user-selections.service';

type DashboardTab = 'leaderboard' | 'selection' | 'scoring' | 'quiz';

type QuizQuestion = {
  id: number;
  question: string;
  answer: boolean;
  explanation: string;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  @Output() teamSelectionClick = new EventEmitter<number | undefined>();
  @Output() logoutClick = new EventEmitter<void>();
  @Output() playerClick = new EventEmitter<{ player: LeaderboardEntryDto; contestId?: number }>();

  protected readonly isJoiningContest = signal(false);
  protected readonly joinContestMessage = signal('');
  protected readonly isLoadingLeaderboard = signal(false);
  protected readonly isLoadingSelection = signal(false);
  protected readonly isLoadingScoring = signal(false);
  protected readonly isLoadingUpcomingEvents = signal(false);
  protected readonly leaderboard = signal<LeaderboardEntryDto[]>([]);
  protected readonly leaderboardMessage = signal('');
  protected readonly myContests = signal<ContestDto[]>([]);
  protected readonly selectedContest = signal<ContestDto | null>(null);
  protected readonly selectedContestId = signal('');
  protected readonly scoringBreakdown = signal<ScoreLedgerEntryDto[]>([]);
  protected readonly scoringMessage = signal('');
  protected readonly upcomingEvents = signal<UpcomingEventDto[]>([]);
  protected readonly upcomingEventsMessage = signal('');
  protected readonly userSelection = signal<UserSelectionDto | null>(null);
  protected readonly selectionItems = signal<UserSelectionItemDto[]>([]);
  protected readonly selectionMessage = signal('');
  protected readonly showJoinLeague = signal(false);
  protected readonly showUpcomingEvents = signal(false);
  protected readonly activeDashboardTab = signal<DashboardTab>('leaderboard');
  protected readonly quizAnswers = signal<Record<number, boolean>>({});
  protected readonly quizQuestions: QuizQuestion[] = [
    {
      id: 1,
      question: 'Da li je golman ikada dao gol glavom u Premijer ligi?',
      answer: true,
      explanation: 'Da. Alisson Becker je 2021. dao gol glavom za Liverpool protiv West Brom-a.',
    },
    {
      id: 2,
      question: 'Da li se Formula 1 trka ikada vozila u Monaku?',
      answer: true,
      explanation: 'Da. Monako je jedna od najpoznatijih trka u F1 kalendaru.',
    },
    {
      id: 3,
      question: 'Da li košarkaški tim sme da ima šest igrača na parketu tokom igre?',
      answer: false,
      explanation: 'Ne. U regularnoj igri tim ima pet igrača na terenu.',
    },
    {
      id: 4,
      question: 'Da li je fudbalski meč moguće završiti rezultatom 0:0?',
      answer: true,
      explanation: 'Da. Ako nema golova do kraja utakmice, rezultat je 0:0.',
    },
    {
      id: 5,
      question: 'Da li u tenisu rezultat 40:40 zovemo deuce?',
      answer: true,
      explanation: 'Da. Na 40:40 se igra na prednost.',
    },
    {
      id: 6,
      question: 'Da li žuti karton u fudbalu znači automatsko isključenje?',
      answer: false,
      explanation: 'Ne. Isključenje dolazi posle crvenog kartona ili drugog žutog.',
    },
    {
      id: 7,
      question: 'Da li maraton ima dužinu veću od 40 kilometara?',
      answer: true,
      explanation: 'Da. Maraton je dug 42,195 kilometara.',
    },
    {
      id: 8,
      question: 'Da li se u odbojci sme igrati nogom?',
      answer: true,
      explanation: 'Da. Lopta sme da se odigra bilo kojim delom tela.',
    },
    {
      id: 9,
      question: 'Da li u boksu runda obično traje 10 minuta?',
      answer: false,
      explanation: 'Ne. Profesionalne runde najčešće traju 3 minuta.',
    },
    {
      id: 10,
      question: 'Da li u MotoGP-u vozači menjaju gume u pit stopu kao u F1?',
      answer: false,
      explanation: 'Ne u standardnom toku trke. U MotoGP-u se kod promene uslova uglavnom menja motor.',
    },
  ];
  protected readonly selectionPoints = computed(() => this.userSelection()?.points ?? 0);
  protected readonly scoringPoints = computed(() =>
    this.scoringBreakdown().reduce((total, entry) => total + this.entryPoints(entry), 0)
  );
  protected readonly quizAnsweredCount = computed(() => Object.keys(this.quizAnswers()).length);
  protected readonly quizScore = computed(() =>
    this.quizQuestions.reduce((score, question) => {
      const answer = this.quizAnswers()[question.id];

      return answer === question.answer ? score + 1 : score;
    }, 0)
  );

  constructor(
    private readonly contestsService: ContestsService,
    private readonly scoringService: ScoringService,
    private readonly userSelectionsService: UserSelectionsService
  ) {}

  ngOnInit(): void {
    this.loadMyContests();
  }

  protected showDashboardTab(tab: DashboardTab): void {
    this.activeDashboardTab.set(tab);
  }

  protected answerQuiz(question: QuizQuestion, answer: boolean): void {
    this.quizAnswers.update((current) => ({ ...current, [question.id]: answer }));
  }

  protected isQuizAnswerCorrect(question: QuizQuestion): boolean {
    return this.quizAnswers()[question.id] === question.answer;
  }

  protected hasQuizAnswer(question: QuizQuestion): boolean {
    return this.quizAnswers()[question.id] !== undefined;
  }

  protected resetQuiz(): void {
    this.quizAnswers.set({});
  }

  protected toggleJoinLeague(): void {
    this.showJoinLeague.update((current) => !current);
  }

  protected toggleUpcomingEvents(): void {
    this.showUpcomingEvents.update((current) => !current);
  }

  protected entryPoints(entry: ScoreLedgerEntryDto): number {
    return entry.points ?? entry.pointsDelta ?? entry.awardedPoints ?? 0;
  }

  protected formatPoints(points: number): string {
    return points.toFixed(2);
  }

  protected entryCompetitor(entry: ScoreLedgerEntryDto): string {
    return entry.competitorName ?? entry.selectionName ?? '-';
  }

  protected entryMatch(entry: ScoreLedgerEntryDto): string {
    const home = entry.eventParticipants?.find((participant) => participant.side === 'HOME')?.competitorName;
    const away = entry.eventParticipants?.find((participant) => participant.side === 'AWAY')?.competitorName;

    if (home || away) {
      return [home, away].filter(Boolean).join(' vs ');
    }

    if (entry.eventName || entry.matchName || entry.fixtureName) {
      return entry.eventName ?? entry.matchName ?? entry.fixtureName ?? '-';
    }

    if (entry.homeCompetitorName || entry.awayCompetitorName) {
      return [entry.homeCompetitorName, entry.awayCompetitorName].filter(Boolean).join(' vs ');
    }

    return entry.eventId ? `Mec #${entry.eventId}` : '-';
  }

  protected scoreRows(entry: ScoreLedgerEntryDto): { label: string; value: string }[] {
    const score = entry.score;

    if (!score) {
      return entry.result ? [{ label: 'Rezultat', value: entry.result }] : [];
    }

    const rows: { label: string; value: string }[] = [];

    if (score.halfTime) {
      rows.push({ label: 'Poluvreme', value: this.formatScore(score.halfTime) });
    }

    if (score.fullTime) {
      rows.push({ label: 'Regularno', value: this.formatScore(score.fullTime) });
    }

    if ((score.duration === 'EXTRA_TIME' || score.duration === 'PENALTY_SHOOTOUT') && score.extraTime) {
      rows.push({ label: 'Produzeci', value: this.formatScore(score.extraTime) });
    }

    if (score.duration === 'PENALTY_SHOOTOUT' && score.penalties) {
      rows.push({ label: 'Penali', value: this.formatScore(score.penalties) });
    }

    return rows;
  }

  protected entryOutcome(entry: ScoreLedgerEntryDto): 'win' | 'draw' | 'loss' | 'unknown' {
    const selectedParticipant = this.entrySelectedParticipant(entry);

    if (selectedParticipant?.winner === true) {
      return 'win';
    }

    if (this.isDraw(entry)) {
      return 'draw';
    }

    if (selectedParticipant?.winner === false || entry.score?.winner) {
      return 'loss';
    }

    return 'unknown';
  }

  protected entryOutcomeLabel(entry: ScoreLedgerEntryDto): string {
    const outcome = this.entryOutcome(entry);

    if (outcome === 'win') {
      return 'Pobeda';
    }

    if (outcome === 'draw') {
      return 'Remi';
    }

    if (outcome === 'loss') {
      return 'Poraz';
    }

    return 'Nepoznato';
  }

  protected isEntryParticipant(entry: ScoreLedgerEntryDto, competitorName: string): boolean {
    return entry.competitorName === competitorName || entry.selectionName === competitorName;
  }

  protected entryParticipantOutcome(
    entry: ScoreLedgerEntryDto,
    participant: EventParticipantDto
  ): 'win' | 'draw' | 'loss' | 'unknown' {
    if (this.isEntryParticipant(entry, participant.competitorName)) {
      return this.entryOutcome(entry);
    }

    if (this.isDraw(entry)) {
      return 'draw';
    }

    if (participant.winner === true) {
      return 'win';
    }

    if (participant.winner === false || entry.score?.winner) {
      return 'loss';
    }

    return 'unknown';
  }

  protected openPlayerResults(player: LeaderboardEntryDto): void {
    this.playerClick.emit({ player, contestId: this.selectedContest()?.id });
  }

  protected contestId(contest: ContestDto): number {
    return contest.id;
  }

  protected contestIdValue(contest: ContestDto): string {
    return String(this.contestId(contest));
  }

  protected contestName(contest: ContestDto): string {
    return contest.name;
  }

  protected displayUsername(player: LeaderboardEntryDto): string {
    return player.username.split('@')[0] || player.username;
  }

  protected eventHomeTeam(event: UpcomingEventDto): string {
    return (
      event.participants.find((participant) => participant.side === 'HOME')?.competitorName ??
      event.participants[0]?.competitorName ??
      '-'
    );
  }

  protected eventAwayTeam(event: UpcomingEventDto): string {
    return (
      event.participants.find((participant) => participant.side === 'AWAY')?.competitorName ??
      event.participants[1]?.competitorName ??
      '-'
    );
  }

  protected formatEventDate(startsAt: string): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(startsAt));
  }

  protected selectContest(contestId: string): void {
    const contest = this.myContests().find((item) => this.contestIdValue(item) === contestId);

    if (!contest || this.selectedContestId() === this.contestIdValue(contest)) {
      return;
    }

    this.loadContest(contest);
  }

  protected joinContest(event: SubmitEvent): void {
    event.preventDefault();
    this.joinContestMessage.set('');

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const inviteCode = String(formData.get('inviteCode') ?? '').trim();

    if (!inviteCode) {
      this.joinContestMessage.set('Unesite kod lige.');
      return;
    }

    this.isJoiningContest.set(true);
    this.contestsService.joinContest(inviteCode).subscribe({
      next: () => {
        this.isJoiningContest.set(false);
        form.reset();
        this.joinContestMessage.set('Liga je dodata.');
        this.loadMyContests();
      },
      error: () => {
        this.isJoiningContest.set(false);
        this.joinContestMessage.set('Kod nije prihvacen. Proverite kod i pokusajte ponovo.');
      },
    });
  }

  private loadMyContests(): void {
    this.contestsService.getMyContests().subscribe({
      next: (contests) => {
        this.myContests.set(contests);

        const contest = this.findInitialContest(contests);

        if (!contest) {
          this.selectedContest.set(null);
          this.selectedContestId.set('');
          this.leaderboard.set([]);
          this.scoringBreakdown.set([]);
          this.upcomingEvents.set([]);
          this.userSelection.set(null);
          this.selectionItems.set([]);
          this.leaderboardMessage.set('Nema dostupnih fantasy liga.');
          this.scoringMessage.set('Nema dostupnih fantasy liga.');
          this.upcomingEventsMessage.set('Nema dostupnih meceva.');
          this.selectionMessage.set('Nema dostupnih fantasy liga.');
          return;
        }

        this.loadContest(contest);
      },
      error: () => {
        this.myContests.set([]);
        this.selectedContest.set(null);
        this.selectedContestId.set('');
        this.leaderboard.set([]);
        this.scoringBreakdown.set([]);
        this.upcomingEvents.set([]);
        this.userSelection.set(null);
        this.selectionItems.set([]);
        this.leaderboardMessage.set('Fantasy lige nisu ucitane. Pokusajte ponovo kasnije.');
        this.scoringMessage.set('Obracun poena nije ucitan. Pokusajte ponovo kasnije.');
        this.upcomingEventsMessage.set('Sledeci mecevi nisu ucitani. Pokusajte ponovo kasnije.');
        this.selectionMessage.set('Izbor timova nije ucitan. Pokusajte ponovo kasnije.');
      },
    });
  }

  private loadContest(contest: ContestDto): void {
    this.selectedContest.set(contest);
    this.selectedContestId.set(this.contestIdValue(contest));
    this.updateContestQueryParam(contest);
    this.loadLeaderboard(contest.id);
    this.loadUpcomingEvents(contest.id);
    this.loadScoringBreakdown(contest.id);
    this.loadUserSelection(contest.id);
  }

  private findInitialContest(contests: ContestDto[]): ContestDto | null {
    const contestIdFromUrl = this.readContestId();

    if (contestIdFromUrl) {
      const contestFromUrl = contests.find((contest) => this.contestIdValue(contest) === contestIdFromUrl);

      if (contestFromUrl) {
        return contestFromUrl;
      }
    }

    return contests[0] ?? null;
  }

  private readContestId(): string | null {
    const contestId = new URLSearchParams(window.location.search).get('contestId');
    const parsedContestId = Number(contestId);

    return contestId && Number.isInteger(parsedContestId) && parsedContestId > 0 ? contestId : null;
  }

  private updateContestQueryParam(contest: ContestDto): void {
    const params = new URLSearchParams(window.location.search);
    params.set('contestId', String(this.contestId(contest)));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }

  private loadLeaderboard(contestId: number): void {
    this.isLoadingLeaderboard.set(true);
    this.leaderboardMessage.set('');

    this.contestsService.getLeaderboard(contestId).subscribe({
      next: (leaderboard) => {
        this.leaderboard.set(leaderboard);
        this.isLoadingLeaderboard.set(false);

        if (!leaderboard.length) {
          this.leaderboardMessage.set('Tabela je trenutno prazna.');
        }
      },
      error: () => {
        this.leaderboard.set([]);
        this.isLoadingLeaderboard.set(false);
        this.leaderboardMessage.set('Tabela nije ucitana. Pokusajte ponovo kasnije.');
      },
    });
  }

  private loadUpcomingEvents(contestId: number): void {
    this.isLoadingUpcomingEvents.set(true);
    this.upcomingEventsMessage.set('');
    this.upcomingEvents.set([]);

    this.userSelectionsService.getUpcomingEvents(contestId).subscribe({
      next: (events) => {
        const upcomingEvents = [...events]
          .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime())
          .slice(0, 5);

        this.upcomingEvents.set(upcomingEvents);
        this.isLoadingUpcomingEvents.set(false);

        if (!upcomingEvents.length) {
          this.upcomingEventsMessage.set('Nema zakazanih meceva za ovu ligu.');
        }
      },
      error: () => {
        this.upcomingEvents.set([]);
        this.isLoadingUpcomingEvents.set(false);
        this.upcomingEventsMessage.set('Sledeci mecevi nisu ucitani. Pokusajte ponovo kasnije.');
      },
    });
  }

  private loadScoringBreakdown(contestId: number): void {
    this.isLoadingScoring.set(true);
    this.scoringMessage.set('');
    this.scoringBreakdown.set([]);

    this.scoringService.getMyBreakdown(contestId).subscribe({
      next: (breakdown) => {
        this.scoringBreakdown.set(breakdown);
        this.isLoadingScoring.set(false);

        if (!breakdown.length) {
          this.scoringMessage.set('Nema obracuna poena za ovu ligu.');
        }
      },
      error: () => {
        this.scoringBreakdown.set([]);
        this.isLoadingScoring.set(false);
        this.scoringMessage.set('Obracun poena nije ucitan. Pokusajte ponovo kasnije.');
      },
    });
  }

  private loadUserSelection(contestId: number): void {
    this.isLoadingSelection.set(true);
    this.selectionMessage.set('');
    this.userSelection.set(null);
    this.selectionItems.set([]);

    this.userSelectionsService.getUserSelections(contestId).subscribe({
      next: (selections) => {
        const selection = selections[0] ?? null;

        this.userSelection.set(selection);
        this.selectionItems.set(selection?.items ?? []);
        this.isLoadingSelection.set(false);

        if (!selection) {
          this.selectionMessage.set('Jos nije sacuvan izbor timova.');
        } else if (!selection.items.length) {
          this.selectionMessage.set('Izbor nema dodate timove.');
        }
      },
      error: () => {
        this.userSelection.set(null);
        this.selectionItems.set([]);
        this.isLoadingSelection.set(false);
        this.selectionMessage.set('Izbor timova nije ucitan. Pokusajte ponovo kasnije.');
      },
    });
  }

  private formatScore(score: ScorePairDto): string {
    return `${score.home}:${score.away}`;
  }

  private entrySelectedParticipant(entry: ScoreLedgerEntryDto) {
    return entry.eventParticipants?.find(
      (participant) =>
        participant.competitorId === entry.competitorId ||
        participant.competitorName === entry.competitorName ||
        participant.competitorName === entry.selectionName
    );
  }

  private isDraw(entry: ScoreLedgerEntryDto): boolean {
    const finalScore = this.finalScore(entry);

    return !!finalScore && finalScore.home === finalScore.away;
  }

  private finalScore(entry: ScoreLedgerEntryDto): ScorePairDto | undefined {
    const score = entry.score;

    if (!score) {
      return undefined;
    }

    if (score.duration === 'PENALTY_SHOOTOUT') {
      return score.penalties ?? score.extraTime ?? score.fullTime;
    }

    if (score.duration === 'EXTRA_TIME') {
      return score.extraTime ?? score.fullTime;
    }

    return score.fullTime;
  }
}
