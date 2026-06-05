import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import type {
  ContestDto,
  LeaderboardEntryDto,
  PlayerStanding,
  ScoreLedgerEntryDto,
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
  protected readonly showOverview = signal(false);
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

  protected toggleOverview(): void {
    this.showOverview.update((current) => !current);
  }

  protected showDashboardTab(tab: 'leaderboard' | 'selection' | 'scoring'): void {
    this.activeDashboardTab.set(tab);
  }

  protected entryPoints(entry: ScoreLedgerEntryDto): number {
    return entry.points ?? entry.pointsDelta ?? entry.awardedPoints ?? 0;
  }

  protected entryCompetitor(entry: ScoreLedgerEntryDto): string {
    return entry.competitorName ?? entry.selectionName ?? '-';
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
}
