export type AppPage =
  | 'login'
  | 'create-account'
  | 'forgot-password'
  | 'successful-registration'
  | 'email-verified'
  | 'dashboard'
  | 'team-selection'
  | 'player-results';

export type Sport = 'FOOTBALL' | 'BASKETBALL' | 'CS2' | 'F1' | 'MOTOGP';

export type CompetitorType = 'TEAM' | 'PLAYER' | 'DRIVER';

export type ContestStatus = 'DRAFT' | 'OPEN' | 'LOCKED' | 'FINISHED';

export type UserSelectionStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED';

export type CompetitorDto = {
  id: number;
  name: string;
  competitionId: number;
  competitionName: string;
  sport: Sport;
  type: CompetitorType;
  groupName?: string;
  odds?: number;
  active: boolean;
};

export type ContestDto = {
  id: number;
  name: string;
  competitionId: number;
  competitionName: string;
  sport: Sport;
  allowedCompetitorType: CompetitorType;
  maxSelections: number;
  lockTime?: string;
  status: ContestStatus;
  scoringStrategyType?: string;
};

export type LeaderboardEntryDto = {
  rank: number;
  userId: number;
  username: string;
  name: string;
  points: number;
};

export type SaveUserSelectionRequestDto = {
  contestId: number;
  competitorIds: number[];
};

export type UserSelectionDto = {
  id: number;
  contestId: number;
  contestName: string;
  competitionId: number;
  competitionName: string;
  status: UserSelectionStatus;
  createdAt: string;
  updatedAt?: string;
  lockedAt?: string;
  points: number;
  items: UserSelectionItemDto[];
};

export type UserSelectionItemDto = {
  id: number;
  competitorId: number;
  competitorName: string;
  competitorType: CompetitorType;
  sport: Sport;
  points: number;
};

export type ScoreLedgerEntryDto = {
  id?: number;
  contestId?: number;
  contestName?: string;
  eventId?: number;
  selectionItemId?: number;
  competitorId?: number;
  eventName?: string;
  matchName?: string;
  fixtureName?: string;
  eventStartsAt?: string;
  homeCompetitorName?: string;
  awayCompetitorName?: string;
  competitorName?: string;
  selectionName?: string;
  ruleCode?: string;
  eventDate?: string;
  eventStartTime?: string;
  result?: string;
  outcome?: string;
  reason?: string;
  points?: number;
  pointsDelta?: number;
  awardedPoints?: number;
  calculatedAt?: string;
  score?: EventScoreDto;
  eventParticipants?: EventParticipantDto[];
};

export type ScoreDuration = 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';

export type ScorePairDto = {
  home: number;
  away: number;
};

export type EventScoreDto = {
  winner?: string;
  duration?: ScoreDuration;
  halfTime?: ScorePairDto;
  fullTime?: ScorePairDto;
  extraTime?: ScorePairDto;
  penalties?: ScorePairDto;
};

export type EventParticipantSide = 'HOME' | 'AWAY';

export type EventParticipantDto = {
  id: number;
  competitorId: number;
  competitorName: string;
  side?: EventParticipantSide;
  seed?: number;
  rank?: number;
  winner?: boolean;
  resultPoints?: number;
};
