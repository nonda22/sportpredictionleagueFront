export type AppUserDto = {
  name: string;
  email: string;
  username: string;
  password?: string;
};

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type AuthResponseDto = {
  accessToken: string;
  tokenType: string;
};
