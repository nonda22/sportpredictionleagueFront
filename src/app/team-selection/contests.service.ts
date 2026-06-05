import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { ContestDto, LeaderboardEntryDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ContestsService {
  constructor(private readonly http: HttpClient) {}

  getMyContests(): Observable<ContestDto[]> {
    return this.http.get<ContestDto[]>(`${API_BASE_URL}/contests/my`);
  }

  getLeaderboard(contestId: number): Observable<LeaderboardEntryDto[]> {
    return this.http.get<LeaderboardEntryDto[]>(`${API_BASE_URL}/contests/${contestId}/leaderboard`);
  }

  joinContest(inviteCode: string): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/contests/${encodeURIComponent(inviteCode)}/memberships/me`, null);
  }
}
