import { Component, HostListener, signal } from '@angular/core';
import { AuthComponent } from './auth/auth.component';
import { AuthService } from './auth/auth.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoadingService } from './loading.service';
import type { AppPage, LeaderboardEntryDto } from './models';
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
  protected readonly selectedLeaderboardPlayer = signal<LeaderboardEntryDto | null>(null);

  constructor(
    private readonly authService: AuthService,
    protected readonly loadingService: LoadingService
  ) {
    const isConfirmingEmail = this.handleEmailConfirmation();

    if (!isConfirmingEmail) {
      this.setDefaultAuthMessage(this.page());
    }

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
    const contestId = this.readContestId();

    this.navigateTo('dashboard', false, contestId ? { contestId } : undefined);
  }

  protected showTeamSelection(contestId?: number): void {
    const selectedContestId = contestId ?? this.readContestId();

    this.navigateTo('team-selection', false, selectedContestId ? { contestId: selectedContestId } : undefined);
  }

  protected showPlayerResults(event: { player: LeaderboardEntryDto; contestId?: number }): void {
    if (!this.canOpenPrivatePage()) {
      return;
    }

    const { player, contestId } = event;
    const selectedContestId = contestId ?? this.readContestId();

    this.selectedLeaderboardPlayer.set(player);
    this.navigateTo('player-results', false, selectedContestId ? { contestId: selectedContestId } : undefined);
  }

  protected selectedPlayer(): LeaderboardEntryDto | null {
    return this.selectedLeaderboardPlayer();
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
    this.setDefaultAuthMessage(nextPage);
  }

  private navigateTo(page: AppPage, replace = false, queryParams?: Record<string, string | number>): void {
    if (this.isPrivatePage(page) && !this.isAuthenticated()) {
      window.history.replaceState({}, '', '/login');
      this.page.set('login');
      return;
    }

    const pathByPage: Record<AppPage, string> = {
      'login': '/login',
      'create-account': '/create-account',
      'forgot-password': '/forgot-password',
      'successful-registration': '/successfull-registration',
      'email-verified': '/email-verified',
      'dashboard': '/dashboard',
      'team-selection': '/izaberi-timove',
      'player-results': `/igrac/${this.selectedPlayer()?.userId ?? ''}`,
    };

    const queryString = queryParams ? `?${new URLSearchParams(this.stringifyQueryParams(queryParams)).toString()}` : '';
    const url = `${pathByPage[page]}${queryString}`;

    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }

    this.page.set(page);
  }

  private stringifyQueryParams(queryParams: Record<string, string | number>): Record<string, string> {
    return Object.fromEntries(Object.entries(queryParams).map(([key, value]) => [key, String(value)]));
  }

  private readContestId(): number | null {
    const contestId = new URLSearchParams(window.location.search).get('contestId');
    const parsedContestId = Number(contestId);

    return Number.isInteger(parsedContestId) && parsedContestId > 0 ? parsedContestId : null;
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

    if (path === '/successfull-registration' || path === '/successful-registration') {
      return 'successful-registration';
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

  private handleEmailConfirmation(): boolean {
    const match = window.location.pathname.match(/^\/api\/v1\/users\/([^/]+)\/confirm-email\/([^/]+)$/);

    if (!match) {
      return false;
    }

    const [, username, token] = match;
    this.page.set('email-verified');
    this.authMessage.set('Potvrdjujemo email adresu...');

    this.authService.confirmEmail(decodeURIComponent(username), decodeURIComponent(token)).subscribe({
      next: () => {
        this.authMessage.set('Email adresa je uspesno potvrdjena. Mozete da se prijavite.');
        this.navigateTo('successful-registration', true);
      },
      error: () => this.authMessage.set('Potvrda email adrese nije uspela. Link je mozda istekao.'),
    });

    return true;
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '-');
  }

  private setDefaultAuthMessage(page: AppPage): void {
    if (page === 'successful-registration' || page === 'email-verified') {
      this.authMessage.set('Email adresa je uspesno potvrdjena. Mozete da se prijavite.');
      return;
    }

    this.authMessage.set('');
  }
}
