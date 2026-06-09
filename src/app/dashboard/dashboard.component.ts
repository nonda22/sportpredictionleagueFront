import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import type {
  ContestDto,
  LeaderboardEntryDto,
  EventParticipantDto,
  PlayerStanding,
  ScoreLedgerEntryDto,
  ScorePairDto,
  UserSelectionDto,
  UserSelectionItemDto,
} from '../models';
import { ScoringService } from '../scoring.service';
import { ContestsService } from '../team-selection/contests.service';
import { UserSelectionsService } from '../team-selection/user-selections.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  @Input({ required: true }) playerStandings: PlayerStanding[] = [];

  @Output() teamSelectionClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
  @Output() playerClick = new EventEmitter<PlayerStanding>();

  protected readonly isJoiningContest = signal(false);
  protected readonly joinContestMessage = signal('');
  protected readonly isLoadingLeaderboard = signal(false);
  protected readonly isLoadingSelection = signal(false);
  protected readonly isLoadingScoring = signal(false);
  protected readonly leaderboard = signal<LeaderboardEntryDto[]>([]);
  protected readonly leaderboardMessage = signal('');
  protected readonly myContests = signal<ContestDto[]>([]);
  protected readonly selectedContest = signal<ContestDto | null>(null);
  protected readonly scoringBreakdown = signal<ScoreLedgerEntryDto[]>([]);
  protected readonly scoringMessage = signal('');
  protected readonly userSelection = signal<UserSelectionDto | null>(null);
  protected readonly selectionItems = signal<UserSelectionItemDto[]>([]);
  protected readonly selectionMessage = signal('');
  protected readonly showJoinLeague = signal(false);
  protected readonly activeDashboardTab = signal<'leaderboard' | 'selection' | 'scoring'>('leaderboard');
  protected readonly canSelectTeams = computed(() => this.myContests().some((contest) => contest.status === 'OPEN'));
  protected readonly selectionPoints = computed(() => this.userSelection()?.points ?? 0);
  protected readonly scoringPoints = computed(() =>
    this.scoringBreakdown().reduce((total, entry) => total + this.entryPoints(entry), 0)
  );

  constructor(
    private readonly contestsService: ContestsService,
    private readonly scoringService: ScoringService,
    private readonly userSelectionsService: UserSelectionsService
  ) {}

  ngOnInit(): void {
    this.loadMyContests();
  }

  protected showDashboardTab(tab: 'leaderboard' | 'selection' | 'scoring'): void {
    this.activeDashboardTab.set(tab);
  }

  protected toggleJoinLeague(): void {
    this.showJoinLeague.update((current) => !current);
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
    this.playerClick.emit({
      rank: player.rank,
      name: player.name || player.username,
      points: player.points,
      wins: 0,
      trend: '',
      selectedTeams: [],
      history: [],
    });
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

        const contest = contests[0];

        if (!contest) {
          this.selectedContest.set(null);
          this.leaderboard.set([]);
          this.scoringBreakdown.set([]);
          this.userSelection.set(null);
          this.selectionItems.set([]);
          this.leaderboardMessage.set('Nema dostupnih fantasy liga.');
          this.scoringMessage.set('Nema dostupnih fantasy liga.');
          this.selectionMessage.set('Nema dostupnih fantasy liga.');
          return;
        }

        this.selectedContest.set(contest);
        this.loadLeaderboard(contest.id);
        this.loadScoringBreakdown(contest.id);
        this.loadUserSelection(contest.id);
      },
      error: () => {
        this.myContests.set([]);
        this.selectedContest.set(null);
        this.leaderboard.set([]);
        this.scoringBreakdown.set([]);
        this.userSelection.set(null);
        this.selectionItems.set([]);
        this.leaderboardMessage.set('Fantasy lige nisu ucitane. Pokusajte ponovo kasnije.');
        this.scoringMessage.set('Obracun poena nije ucitan. Pokusajte ponovo kasnije.');
        this.selectionMessage.set('Izbor timova nije ucitan. Pokusajte ponovo kasnije.');
      },
    });
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

    this.userSelectionsService.getUserSelections().subscribe({
      next: (selections) => {
        const selection = selections.find((item) => item.contestId === contestId) ?? selections[0] ?? null;

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
