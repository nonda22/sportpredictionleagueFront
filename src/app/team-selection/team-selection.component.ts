import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import type { CompetitorDto, ContestDto, UserSelectionDto } from '../models';
import { ContestsService } from './contests.service';
import { TeamsService } from './teams.service';
import { UserSelectionsService } from './user-selections.service';

type TeamPot = {
  name: string;
  teams: CompetitorDto[];
};

@Component({
  selector: 'app-team-selection',
  imports: [DecimalPipe],
  templateUrl: './team-selection.component.html',
  styleUrl: './team-selection.component.scss',
})
export class TeamSelectionComponent implements OnInit {
  private readonly contestIdFromUrl = this.readContestId();
  protected readonly contests = signal<ContestDto[]>([]);
  protected readonly selectedContest = signal<ContestDto | null>(null);
  protected readonly pots = signal<TeamPot[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly loadError = signal('');
  protected readonly selectedTeams = signal<Record<number, boolean>>({});
  protected readonly hasExistingSelection = signal(false);
  protected readonly hasUsedLuckyPick = signal(false);
  protected readonly maxSelections = computed(() => this.selectedContest()?.maxSelections ?? 0);
  protected readonly selectedTeamNames = computed(() => {
    const names: string[] = [];
    const selected = this.selectedTeams();

    for (const pot of this.pots()) {
      for (const team of pot.teams) {
        if (selected[team.id]) {
          names.push(this.teamName(team));
        }
      }
    }

    return names;
  });
  protected readonly saveMessage = signal('');

  constructor(
    private readonly contestsService: ContestsService,
    private readonly teamsService: TeamsService,
    private readonly userSelectionsService: UserSelectionsService
  ) {}

  ngOnInit(): void {
    this.loadTeams();
  }

  protected toggleTeam(team: CompetitorDto, checked: boolean): void {
    this.saveMessage.set('');

    this.selectedTeams.update((current) => {
      const next = { ...current };

      if (checked) {
        if (this.selectedCount() >= this.maxSelections()) {
          return current;
        }

        next[team.id] = true;
      } else {
        delete next[team.id];
      }

      return next;
    });
  }

  protected useLuckyPick(): void {
    const contest = this.selectedContest();

    if (!contest || this.hasUsedLuckyPick()) {
      return;
    }

    const confirmed = window.confirm('Da li ste sigurni? Imate samo jedan pokusaj. Okusajte srecu :)');

    if (!confirmed) {
      return;
    }

    const luckyTeams = this.pickRandomTeamFromEachPot();

    if (luckyTeams.length !== this.maxSelections()) {
      this.saveMessage.set('Random izbor nije moguc za ovu ligu.');
      return;
    }

    const selected = luckyTeams.reduce<Record<number, boolean>>((current, team) => {
      current[team.id] = true;
      return current;
    }, {});

    this.selectedTeams.set(selected);
    this.hasUsedLuckyPick.set(true);
    this.saveLuckyPickUsage(contest);
    this.saveMessage.set('Sreca je odabrala timove. Mozete ih rucno izmeniti pre cuvanja.');
  }

  protected selectedCount(): number {
    return Object.values(this.selectedTeams()).filter(Boolean).length;
  }

  protected contestId(contest: ContestDto): number {
    return contest.id;
  }

  protected contestName(contest: ContestDto): string {
    return contest.name;
  }

  protected teamName(team: CompetitorDto): string {
    return team.name;
  }

  protected selectContest(contestId: string): void {
    const parsedContestId = Number(contestId);
    const contest = this.contests().find((item) => this.contestId(item) === parsedContestId);

    if (!contest) {
      return;
    }

    this.loadContest(contest);
  }

  protected saveSelection(): void {
    const contest = this.selectedContest();
    const contestId = contest ? this.contestId(contest) : 0;

    if (!contestId) {
      this.saveMessage.set('Fantasy liga nije izabrana.');
      return;
    }

    if (this.selectedCount() !== this.maxSelections()) {
      this.saveMessage.set(`Izaberi ${this.maxSelections()} timova pre cuvanja.`);
      return;
    }

    this.isSaving.set(true);
    this.saveMessage.set('');

    const request = {
      contestId,
      competitorIds: Object.entries(this.selectedTeams())
        .filter(([, selected]) => selected)
        .map(([teamId]) => Number(teamId)),
    };
    const saveRequest = this.hasExistingSelection()
      ? this.userSelectionsService.updateSelection(request)
      : this.userSelectionsService.saveSelection(request);

    saveRequest.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.hasExistingSelection.set(true);
        this.saveMessage.set('Izbor je sacuvan.');
      },
      error: () => {
        this.isSaving.set(false);
        this.saveMessage.set('Cuvanje izbora nije uspelo. Pokusajte ponovo.');
      },
    });
  }

  private loadTeams(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.contestsService
      .getMyContests()
      .pipe(
        tap((contests) => this.contests.set(contests)),
        switchMap((contests) => {
          const contest = this.findInitialContest(contests);

          if (!contest) {
            throw new Error('No contests available');
          }

          this.selectedContest.set(contest);

          return this.loadContestData(contest);
        })
      )
      .subscribe({
        next: ({ teams, selections }) => this.applyContestData(teams, selections),
        error: () => {
          this.loadError.set('Fantasy lige i timovi nisu ucitani. Pokusajte ponovo kasnije.');
          this.isLoading.set(false);
        },
      });
  }

  private loadContest(contest: ContestDto): void {
    this.selectedContest.set(contest);
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveMessage.set('');
    this.hasUsedLuckyPick.set(this.readLuckyPickUsage(contest));

    this.loadContestData(contest).subscribe({
      next: ({ teams, selections }) => this.applyContestData(teams, selections),
      error: () => {
        this.loadError.set('Timovi nisu ucitani. Pokusajte ponovo kasnije.');
        this.isLoading.set(false);
      },
    });
  }

  private loadContestData(contest: ContestDto) {
    return forkJoin({
      teams: this.teamsService.getCompetitors(contest.competitionId),
      selections: this.userSelectionsService
        .getUserSelections()
        .pipe(catchError(() => of([] as UserSelectionDto[]))),
    });
  }

  private applyContestData(teams: CompetitorDto[], selections: UserSelectionDto[]): void {
    const contest = this.selectedContest();
    const contestId = contest ? this.contestId(contest) : 0;
    const selectedSelection = selections.find((selection) => selection.contestId === contestId) ?? selections[0];
    const pots = this.groupTeams(teams);

    this.pots.set(pots);
    this.selectedTeams.set(this.mapSelectionsToTeamIds(selectedSelection));
    this.hasExistingSelection.set(Boolean(selectedSelection));
    this.hasUsedLuckyPick.set(contest ? this.readLuckyPickUsage(contest) : false);
    this.isLoading.set(false);
  }

  private groupTeams(teams: CompetitorDto[]): TeamPot[] {
    const groups = new Map<string, CompetitorDto[]>();

    for (const team of teams) {
      const groupName = team.groupName || 'Ostali';
      groups.set(groupName, [...(groups.get(groupName) ?? []), team]);
    }

    return Array.from(groups.entries()).map(([name, groupedTeams]) => ({
      name,
      teams: groupedTeams.sort((a, b) => this.compareTeamsByOdds(a, b)),
    }));
  }

  private compareTeamsByOdds(a: CompetitorDto, b: CompetitorDto): number {
    const aOdds = a.odds ?? Number.POSITIVE_INFINITY;
    const bOdds = b.odds ?? Number.POSITIVE_INFINITY;

    if (aOdds !== bOdds) {
      return aOdds - bOdds;
    }

    return this.teamName(a).localeCompare(this.teamName(b));
  }

  private mapSelectionsToTeamIds(selection?: UserSelectionDto): Record<number, boolean> {
    const selected: Record<number, boolean> = {};

    for (const item of selection?.items ?? []) {
      selected[item.competitorId] = true;
    }

    return selected;
  }

  private pickRandomTeamFromEachPot(): CompetitorDto[] {
    return this.pots()
      .slice(0, this.maxSelections())
      .map((pot) => pot.teams[Math.floor(Math.random() * pot.teams.length)])
      .filter((team): team is CompetitorDto => Boolean(team));
  }

  private saveLuckyPickUsage(contest: ContestDto): void {
    localStorage.setItem(this.luckyPickStorageKey(contest), 'true');
  }

  private readLuckyPickUsage(contest: ContestDto): boolean {
    return localStorage.getItem(this.luckyPickStorageKey(contest)) === 'true';
  }

  private luckyPickStorageKey(contest: ContestDto): string {
    return `fifabet:lucky-pick:${this.contestId(contest)}`;
  }

  private findInitialContest(contests: ContestDto[]): ContestDto | null {
    if (this.contestIdFromUrl) {
      const contestFromUrl = contests.find((contest) => this.contestId(contest) === this.contestIdFromUrl);

      if (contestFromUrl) {
        return contestFromUrl;
      }
    }

    return contests[0] ?? null;
  }

  private readContestId(): number | null {
    const contestId = new URLSearchParams(window.location.search).get('contestId');
    const parsedContestId = Number(contestId);

    return Number.isInteger(parsedContestId) && parsedContestId > 0 ? parsedContestId : null;
  }
}
