import { DecimalPipe } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import type { ContestDto, MatchOutcome, PlayerMatch, PlayerStanding, ScoreLedgerEntryDto, ScorePairDto } from '../models';
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
    const value = entry.eventDate ?? entry.eventStartTime ?? entry.calculatedAt;

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

  private formatScore(score: ScorePairDto): string {
    return `${score.home}:${score.away}`;
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
