import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import type { ScoreLedgerEntryDto } from './models';

@Injectable({ providedIn: 'root' })
export class ScoringService {
  constructor(private readonly http: HttpClient) {}

  getMyBreakdown(contestId?: number): Observable<ScoreLedgerEntryDto[]> {
    const options = contestId ? { params: new HttpParams().set('contestId', contestId) } : undefined;

    return this.http.get<ScoreLedgerEntryDto[]>(`${API_BASE_URL}/scoring/my-breakdown`, options);
  }

  getUserBreakdown(userId: number, contestId: number): Observable<ScoreLedgerEntryDto[]> {
    const params = new HttpParams().set('contestId', contestId);

    return this.http.get<ScoreLedgerEntryDto[]>(`${API_BASE_URL}/scoring/users/${userId}/breakdown`, { params });
  }
}
