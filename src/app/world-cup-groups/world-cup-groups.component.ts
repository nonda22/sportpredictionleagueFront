import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';

type WorldCupTeamDto = {
  name: string;
  name_normalised?: string;
  continent: string;
  flag_icon: string;
  flag_unicode: string;
  fifa_code: string;
  group: string;
  confed: string;
};

type WorldCupGroup = {
  name: string;
  teams: WorldCupTeamDto[];
};

const WORLD_CUP_TEAMS_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json';

@Component({
  selector: 'app-world-cup-groups',
  templateUrl: './world-cup-groups.component.html',
  styleUrl: './world-cup-groups.component.scss',
})
export class WorldCupGroupsComponent implements OnInit {
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly teams = signal<WorldCupTeamDto[]>([]);
  protected readonly groups = computed<WorldCupGroup[]>(() => this.groupTeams(this.teams()));

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<WorldCupTeamDto[]>(WORLD_CUP_TEAMS_URL).subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Grupe nisu ucitane. Pokusajte ponovo kasnije.');
        this.isLoading.set(false);
      },
    });
  }

  protected flagIcon(team: WorldCupTeamDto): string {
    return team.flag_icon || this.decodeFlagUnicode(team.flag_unicode);
  }

  protected displayName(team: WorldCupTeamDto): string {
    return team.name_normalised || team.name;
  }

  private groupTeams(teams: WorldCupTeamDto[]): WorldCupGroup[] {
    const groups = new Map<string, WorldCupTeamDto[]>();

    for (const team of teams) {
      groups.set(team.group, [...(groups.get(team.group) ?? []), team]);
    }

    return Array.from(groups.entries())
      .sort(([firstGroup], [secondGroup]) => firstGroup.localeCompare(secondGroup))
      .map(([name, groupTeams]) => ({
        name,
        teams: groupTeams,
      }));
  }

  private decodeFlagUnicode(value: string): string {
    return value.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    );
  }
}
