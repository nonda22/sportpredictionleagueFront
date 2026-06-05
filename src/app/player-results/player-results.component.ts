import { DecimalPipe } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import type { ContestDto, MatchOutcome, PlayerMatch, PlayerStanding, ScoreLedgerEntryDto } from '../models';
import { ScoringService } from '../scoring.service';
import { ContestsService } from '../team-selection/contests.service';

const outcomeMultiplier: Record<MatchOutcome, number> = {
  pobeda: 3,
  remi: 1,
  poraz: 0,
};

@Component({
  selector: 'app-player-results',
  imports: [DecimalPipe],
  templateUrl: './player-results.component.html',
  styleUrl: './player-results.component.scss',
})
export class PlayerResultsComponent implements OnInit {
  @Input({ required: true }) player!: PlayerStanding;

  protected readonly contests = signal<ContestDto[]>([]);
  protected readonly selectedContest = signal<ContestDto | null>(null);
  protected readonly breakdown = signal<ScoreLedgerEntryDto[]>([]);
  protected readonly isLoadingBreakdown = signal(false);
  protected readonly breakdownError = signal('');

  constructor(
    private readonly contestsService: ContestsService,
    private readonly scoringService: ScoringService
  ) {}

  ngOnInit(): void {
    this.loadContests();
  }

  protected pointsFor(match: PlayerMatch): number {
    return match.odds * outcomeMultiplier[match.outcome];
  }

  protected totalHistoryPoints(): number {
    const breakdown = this.breakdown();

    if (breakdown.length) {
      return breakdown.reduce((total, entry) => total + this.entryPoints(entry), 0);
    }

    return this.player.history.reduce((total, match) => total + this.pointsFor(match), 0);
  }

  protected selectContest(contestId: string): void {
    const parsedContestId = Number(contestId);
    const contest = this.contests().find((item) => item.id === parsedContestId);

    if (!contest) {
      return;
    }

    this.selectedContest.set(contest);
    this.loadBreakdown(contest.id);
  }

  protected entryDate(entry: ScoreLedgerEntryDto): string {
    const value = entry.eventDate ?? entry.eventStartTime;

    if (!value) {
      return '-';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('sr-RS');
  }

  protected entryMatch(entry: ScoreLedgerEntryDto): string {
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

  protected entryPoints(entry: ScoreLedgerEntryDto): number {
    return entry.points ?? entry.pointsDelta ?? entry.awardedPoints ?? 0;
  }

  private loadContests(): void {
    this.isLoadingBreakdown.set(true);
    this.breakdownError.set('');

    this.contestsService.getMyContests().subscribe({
      next: (contests) => {
        this.contests.set(contests);

        const contest = this.findInitialContest(contests);
        this.selectedContest.set(contest);

        if (!contest) {
          this.isLoadingBreakdown.set(false);
          this.breakdownError.set('Nema dostupnih fantasy liga.');
          return;
        }

        this.loadBreakdown(contest.id);
      },
      error: () => {
        this.isLoadingBreakdown.set(false);
        this.breakdownError.set('Fantasy lige nisu ucitane. Pokusajte ponovo kasnije.');
      },
    });
  }

  private loadBreakdown(contestId: number): void {
    this.isLoadingBreakdown.set(true);
    this.breakdownError.set('');
    this.breakdown.set([]);

    this.scoringService.getMyBreakdown(contestId).subscribe({
      next: (breakdown) => {
        this.breakdown.set(breakdown);
        this.isLoadingBreakdown.set(false);
      },
      error: () => {
        this.isLoadingBreakdown.set(false);
        this.breakdownError.set('Poeni po mecu nisu ucitani. Pokusajte ponovo kasnije.');
      },
    });
  }

  private findInitialContest(contests: ContestDto[]): ContestDto | null {
    const contestId = new URLSearchParams(window.location.search).get('contestId');
    const parsedContestId = Number(contestId);

    if (Number.isInteger(parsedContestId) && parsedContestId > 0) {
      const contest = contests.find((item) => item.id === parsedContestId);

      if (contest) {
        return contest;
      }
    }

    return contests[0] ?? null;
  }
}
