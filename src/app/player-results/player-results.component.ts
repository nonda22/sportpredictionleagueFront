import { DecimalPipe } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import type { ContestDto, LeaderboardEntryDto, ScoreLedgerEntryDto, ScorePairDto, UserSelectionDto } from '../models';
import { ScoringService } from '../scoring.service';
import { ContestsService } from '../team-selection/contests.service';
import { UserSelectionsService } from '../team-selection/user-selections.service';

@Component({
  selector: 'app-player-results',
  imports: [DecimalPipe],
  templateUrl: './player-results.component.html',
  styleUrl: './player-results.component.scss',
})
export class PlayerResultsComponent implements OnChanges, OnInit {
  @Input({ required: true }) player!: LeaderboardEntryDto;

  protected readonly displayedPlayer = signal<LeaderboardEntryDto | null>(null);
  protected readonly contests = signal<ContestDto[]>([]);
  protected readonly selectedContest = signal<ContestDto | null>(null);
  protected readonly userSelection = signal<UserSelectionDto | null>(null);
  protected readonly breakdown = signal<ScoreLedgerEntryDto[]>([]);
  protected readonly isLoadingDetails = signal(false);
  protected readonly detailsError = signal('');

  constructor(
    private readonly contestsService: ContestsService,
    private readonly scoringService: ScoringService,
    private readonly userSelectionsService: UserSelectionsService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['player']) {
      this.displayedPlayer.set(this.player);
    }
  }

  ngOnInit(): void {
    this.displayedPlayer.set(this.player);
    this.loadContests();
  }

  protected totalBreakdownPoints(): number {
    return this.breakdown().reduce((total, entry) => total + this.entryPoints(entry), 0);
  }

  protected entryDate(entry: ScoreLedgerEntryDto): string {
    const value = entry.eventDate ?? entry.eventStartTime ?? entry.eventStartsAt ?? entry.calculatedAt;

    if (!value) {
      return '-';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('sr-RS');
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

  protected entrySelection(entry: ScoreLedgerEntryDto): string {
    return entry.competitorName ?? entry.selectionName ?? '-';
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

    if (score.winner) {
      rows.push({ label: 'Pobednik', value: score.winner });
    }

    return rows;
  }

  protected entryPoints(entry: ScoreLedgerEntryDto): number {
    return entry.points ?? entry.pointsDelta ?? entry.awardedPoints ?? 0;
  }

  private loadContests(): void {
    this.isLoadingDetails.set(true);
    this.detailsError.set('');

    this.contestsService.getMyContests().subscribe({
      next: (contests) => {
        this.contests.set(contests);

        const contest = this.findInitialContest(contests);
        this.selectedContest.set(contest);

        if (!contest) {
          this.isLoadingDetails.set(false);
          this.detailsError.set('Nema dostupnih fantasy liga.');
          return;
        }

        this.updateContestQueryParam(contest);
        this.loadPlayerDetails(contest.id);
      },
      error: () => {
        this.isLoadingDetails.set(false);
        this.detailsError.set('Fantasy lige nisu ucitane. Pokusajte ponovo kasnije.');
      },
    });
  }

  private loadPlayerDetails(contestId: number): void {
    this.isLoadingDetails.set(true);
    this.detailsError.set('');
    this.userSelection.set(null);
    this.breakdown.set([]);

    forkJoin({
      leaderboard: this.contestsService.getLeaderboard(contestId),
      selections: this.userSelectionsService.getUserSelectionsByUserId(this.player.userId, contestId),
      breakdown: this.scoringService.getUserBreakdown(this.player.userId, contestId),
    }).subscribe({
      next: ({ leaderboard, selections, breakdown }) => {
        const leaderboardPlayer = leaderboard.find((entry) => entry.userId === this.player.userId);

        this.displayedPlayer.set(leaderboardPlayer ?? this.player);
        this.userSelection.set(selections.find((selection) => selection.contestId === contestId) ?? selections[0] ?? null);
        this.breakdown.set(breakdown);
        this.isLoadingDetails.set(false);
      },
      error: () => {
        this.isLoadingDetails.set(false);
        this.detailsError.set('Detalji igraca nisu ucitani. Pokusajte ponovo kasnije.');
      },
    });
  }

  private findInitialContest(contests: ContestDto[]): ContestDto | null {
    const contestId = new URLSearchParams(window.location.search).get('contestId');
    const parsedContestId = Number(contestId);

    if (contestId && Number.isInteger(parsedContestId) && parsedContestId > 0) {
      const contest = contests.find((item) => String(item.id) === contestId);

      if (contest) {
        return contest;
      }
    }

    return contests[0] ?? null;
  }

  private updateContestQueryParam(contest: ContestDto): void {
    const params = new URLSearchParams(window.location.search);
    params.set('contestId', String(contest.id));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }

  private formatScore(score: ScorePairDto): string {
    return `${score.home}:${score.away}`;
  }
}
