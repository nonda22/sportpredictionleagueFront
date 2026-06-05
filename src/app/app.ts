import { Component, HostListener, signal } from '@angular/core';
import { AuthComponent } from './auth/auth.component';
import { AuthService } from './auth/auth.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import type { AppPage, PlayerStanding } from './models';
import { PlayerResultsComponent } from './player-results/player-results.component';
import { TeamSelectionComponent } from './team-selection/team-selection.component';

@Component({
  selector: 'app-root',
  imports: [AuthComponent, DashboardComponent, TeamSelectionComponent, PlayerResultsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('fifabet');
  protected readonly page = signal<AppPage>(this.pageFromPath());
  protected readonly authMessage = signal('');
  protected readonly playerStandings: PlayerStanding[] = [
    {
      rank: 1,
      name: 'Ivan',
      points: 128,
      wins: 24,
      trend: '+18',
      selectedTeams: ['Argentina', 'Danska', 'Srbija', 'Japan'],
      history: [
        { date: '14.06.2026', match: 'Serbia vs Brazil', odds: 2.45, result: '2:1', outcome: 'pobeda' },
        { date: '18.06.2026', match: 'Argentina vs Japan', odds: 1.75, result: '1:1', outcome: 'remi' },
        { date: '23.06.2026', match: 'Danska vs Kanada', odds: 2.1, result: '3:0', outcome: 'pobeda' },
        { date: '28.06.2026', match: 'Francuska vs Srbija', odds: 3.2, result: '0:2', outcome: 'poraz' },
      ],
    },
    {
      rank: 2,
      name: 'Marko',
      points: 119,
      wins: 22,
      trend: '+14',
      selectedTeams: ['Francuska', 'Maroko', 'Turska', 'Kanada'],
      history: [
        { date: '14.06.2026', match: 'Francuska vs Kanada', odds: 1.85, result: '2:0', outcome: 'pobeda' },
        { date: '19.06.2026', match: 'Maroko vs Brazil', odds: 2.7, result: '1:1', outcome: 'remi' },
        { date: '24.06.2026', match: 'Turska vs Japan', odds: 2.2, result: '2:1', outcome: 'pobeda' },
        { date: '29.06.2026', match: 'Spanija vs Francuska', odds: 2.95, result: '1:0', outcome: 'poraz' },
      ],
    },
    {
      rank: 3,
      name: 'Jelena',
      points: 113,
      wins: 21,
      trend: '+12',
      selectedTeams: ['Spanija', 'Kolumbija', 'Poljska', 'Australija'],
      history: [
        { date: '15.06.2026', match: 'Spanija vs Australija', odds: 1.92, result: '3:1', outcome: 'pobeda' },
        { date: '20.06.2026', match: 'Kolumbija vs Srbija', odds: 2.35, result: '0:0', outcome: 'remi' },
        { date: '25.06.2026', match: 'Poljska vs Kanada', odds: 2.15, result: '1:2', outcome: 'poraz' },
        { date: '30.06.2026', match: 'Spanija vs Japan', odds: 1.8, result: '2:0', outcome: 'pobeda' },
      ],
    },
    {
      rank: 4,
      name: 'Nikola',
      points: 106,
      wins: 20,
      trend: '+9',
      selectedTeams: ['Brazil', 'Japan', 'Norveska', 'Katar'],
      history: [
        { date: '15.06.2026', match: 'Brazil vs Norveska', odds: 1.7, result: '2:0', outcome: 'pobeda' },
        { date: '20.06.2026', match: 'Japan vs Katar', odds: 2.05, result: '1:1', outcome: 'remi' },
        { date: '25.06.2026', match: 'Brazil vs Kanada', odds: 1.62, result: '3:1', outcome: 'pobeda' },
        { date: '01.07.2026', match: 'Norveska vs Spanija', odds: 2.9, result: '0:1', outcome: 'poraz' },
      ],
    },
    {
      rank: 5,
      name: 'Ana',
      points: 101,
      wins: 19,
      trend: '+7',
      selectedTeams: ['Engleska', 'SAD', 'Egipat', 'Panama'],
      history: [
        { date: '16.06.2026', match: 'Engleska vs Panama', odds: 1.66, result: '2:0', outcome: 'pobeda' },
        { date: '21.06.2026', match: 'SAD vs Egipat', odds: 2.4, result: '1:1', outcome: 'remi' },
        { date: '26.06.2026', match: 'Egipat vs Brazil', odds: 3.1, result: '0:2', outcome: 'poraz' },
        { date: '01.07.2026', match: 'Engleska vs Japan', odds: 1.95, result: '1:0', outcome: 'pobeda' },
      ],
    },
    {
      rank: 6,
      name: 'Milos',
      points: 96,
      wins: 18,
      trend: '+6',
      selectedTeams: ['Portugal', 'Meksiko', 'Alzir', 'Irak'],
      history: [
        { date: '16.06.2026', match: 'Portugal vs Irak', odds: 1.58, result: '3:0', outcome: 'pobeda' },
        { date: '21.06.2026', match: 'Meksiko vs Alzir', odds: 2.25, result: '2:2', outcome: 'remi' },
        { date: '26.06.2026', match: 'Portugal vs Srbija', odds: 2.05, result: '1:2', outcome: 'poraz' },
        { date: '02.07.2026', match: 'Alzir vs Kanada', odds: 2.55, result: '2:1', outcome: 'pobeda' },
      ],
    },
    {
      rank: 7,
      name: 'Sara',
      points: 91,
      wins: 17,
      trend: '+4',
      selectedTeams: ['Holandija', 'Senegal', 'Kamerun', 'Novi Zeland'],
      history: [
        { date: '17.06.2026', match: 'Holandija vs Novi Zeland', odds: 1.6, result: '2:0', outcome: 'pobeda' },
        { date: '22.06.2026', match: 'Senegal vs Kamerun', odds: 2.3, result: '0:0', outcome: 'remi' },
        { date: '27.06.2026', match: 'Kamerun vs Francuska', odds: 3.4, result: '0:3', outcome: 'poraz' },
        { date: '02.07.2026', match: 'Holandija vs Meksiko', odds: 2.0, result: '2:1', outcome: 'pobeda' },
      ],
    },
    {
      rank: 8,
      name: 'Luka',
      points: 84,
      wins: 16,
      trend: '+3',
      selectedTeams: ['Belgija', 'Svica', 'Skotska', 'Juzna Afrika'],
      history: [
        { date: '17.06.2026', match: 'Belgija vs Juzna Afrika', odds: 1.72, result: '1:0', outcome: 'pobeda' },
        { date: '22.06.2026', match: 'Svica vs Skotska', odds: 2.15, result: '1:1', outcome: 'remi' },
        { date: '27.06.2026', match: 'Skotska vs Portugal', odds: 3.0, result: '0:2', outcome: 'poraz' },
        { date: '03.07.2026', match: 'Belgija vs Kanada', odds: 2.05, result: '2:0', outcome: 'pobeda' },
      ],
    },
  ];

  constructor(private readonly authService: AuthService) {
    this.handleEmailConfirmation();

    if (window.location.pathname === '/') {
      this.navigateTo('login', true);
      return;
    }

    if (this.page() === 'login' && this.isAuthenticated()) {
      this.navigateTo('dashboard', true);
      return;
    }

    if (this.isPrivatePage(this.page()) && !this.authService.isAuthenticated()) {
      this.authService.refresh().subscribe({
        next: () => {
          this.page.set(this.pageFromPath());
        },
        error: () => {
          this.authService.clearAuth();
          this.navigateTo('login', true);
        },
      });
    }
  }

  protected login(event: SubmitEvent): void {
    event.preventDefault();
    this.authMessage.set('');

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    this.authService.login({ username, password }).subscribe({
      next: () => this.navigateTo('dashboard', true),
      error: () => this.authMessage.set('Neuspesna prijava. Proverite korisnicko ime i lozinku.'),
    });
  }

  protected logout(): void {
    this.authMessage.set('');
    this.authService.logout().subscribe({
      next: () => this.navigateTo('login', true),
      error: () => {
        this.authService.clearAuth();
        this.navigateTo('login', true);
      },
    });
  }

  protected showDashboard(): void {
    this.navigateTo('dashboard');
  }

  protected showTeamSelection(): void {
    this.navigateTo('team-selection');
  }

  protected showPlayerResults(player: PlayerStanding): void {
    if (!this.canOpenPrivatePage()) {
      return;
    }

    window.history.pushState({}, '', `/igrac/${this.slugify(player.name)}`);
    this.page.set('player-results');
  }

  protected selectedPlayer(): PlayerStanding {
    const slug = window.location.pathname.split('/').filter(Boolean).at(1);

    return this.playerStandings.find((player) => this.slugify(player.name) === slug) ?? this.playerStandings[0];
  }

  protected showCreateAccount(event: Event): void {
    event.preventDefault();
    this.authMessage.set('');
    this.navigateTo('create-account');
  }

  protected showForgotPassword(event: Event): void {
    event.preventDefault();
    this.authMessage.set('');
    this.navigateTo('forgot-password');
  }

  protected showLogin(event?: Event): void {
    event?.preventDefault();
    this.authMessage.set('');
    this.navigateTo('login');
  }

  protected createAccount(event: SubmitEvent): void {
    event.preventDefault();
    this.authMessage.set('');

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      this.authMessage.set('Lozinke se ne poklapaju.');
      return;
    }

    const firstName = String(formData.get('firstName') ?? '').trim();
    const lastName = String(formData.get('lastName') ?? '').trim();
    const username = String(formData.get('username') ?? '').trim();

    this.authService
      .register({
        name: [firstName, lastName].filter(Boolean).join(' '),
        email: String(formData.get('email') ?? '').trim(),
        username,
        password,
      })
      .subscribe({
        next: () => {
          form.reset();
          this.authMessage.set('Nalog je kreiran. Proverite email za potvrdu naloga.');
        },
        error: () => this.authMessage.set('Registracija nije uspela. Proverite podatke i pokusajte ponovo.'),
      });
  }

  protected requestPasswordReset(event: SubmitEvent): void {
    event.preventDefault();
    this.authMessage.set('Password reset form is ready. Backend reset flow can be connected here.');
  }

  @HostListener('window:popstate')
  protected syncPageWithUrl(): void {
    const nextPage = this.pageFromPath();

    if (this.isPrivatePage(nextPage) && !this.isAuthenticated()) {
      this.navigateTo('login', true);
      return;
    }

    if (nextPage === 'login' && this.isAuthenticated()) {
      this.navigateTo('dashboard', true);
      return;
    }

    this.page.set(nextPage);
    this.authMessage.set('');
  }

  private navigateTo(page: AppPage, replace = false): void {
    if (this.isPrivatePage(page) && !this.isAuthenticated()) {
      window.history.replaceState({}, '', '/login');
      this.page.set('login');
      return;
    }

    const pathByPage: Record<AppPage, string> = {
      'login': '/login',
      'create-account': '/create-account',
      'forgot-password': '/forgot-password',
      'email-verified': '/email-verified',
      'dashboard': '/dashboard',
      'team-selection': '/izaberi-timove',
      'player-results': `/igrac/${this.slugify(this.selectedPlayer().name)}`,
    };

    if (replace) {
      window.history.replaceState({}, '', pathByPage[page]);
    } else {
      window.history.pushState({}, '', pathByPage[page]);
    }

    this.page.set(page);
  }

  private pageFromPath(): AppPage {
    const path = window.location.pathname;

    if (path === '/dashboard') {
      return 'dashboard';
    }

    if (path === '/izaberi-timove') {
      return 'team-selection';
    }

    if (path.startsWith('/igrac/')) {
      return 'player-results';
    }

    if (path === '/create-account') {
      return 'create-account';
    }

    if (path === '/forgot-password') {
      return 'forgot-password';
    }

    if (path === '/email-verified') {
      return 'email-verified';
    }

    if (path === '/login' || path === '/') {
      return 'login';
    }

    return 'login';
  }

  private canOpenPrivatePage(): boolean {
    if (this.isAuthenticated()) {
      return true;
    }

    this.navigateTo('login', true);
    return false;
  }

  private isPrivatePage(page: AppPage): boolean {
    return page === 'dashboard' || page === 'team-selection' || page === 'player-results';
  }

  private isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  private handleEmailConfirmation(): void {
    const match = window.location.pathname.match(/^\/api\/v1\/users\/([^/]+)\/confirm-email\/([^/]+)$/);

    if (!match) {
      return;
    }

    const [, username, token] = match;
    this.page.set('email-verified');
    this.authMessage.set('Potvrdjujemo email adresu...');

    this.authService.confirmEmail(decodeURIComponent(username), decodeURIComponent(token)).subscribe({
      next: () => {
        this.authMessage.set('');
        this.navigateTo('email-verified', true);
      },
      error: () => this.authMessage.set('Potvrda email adrese nije uspela. Link je mozda istekao.'),
    });
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '-');
  }
}
