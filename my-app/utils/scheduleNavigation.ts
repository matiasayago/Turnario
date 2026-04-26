let openManageScheduleModalOnce = false;

export function requestOpenManageScheduleModal(): void {
  openManageScheduleModalOnce = true;
}

export function consumeOpenManageScheduleModalRequest(): boolean {
  const value = openManageScheduleModalOnce;
  openManageScheduleModalOnce = false;
  return value;
}

