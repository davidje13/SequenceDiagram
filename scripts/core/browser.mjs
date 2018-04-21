export const nodejs = (typeof window === 'undefined');

export const headless = nodejs;

// Thanks, https://stackoverflow.com/a/23522755/1180785
export const safari = (
	!nodejs &&
	(/^((?!chrome|android).)*safari/i).test(window.navigator.userAgent)
);

// Thanks, https://stackoverflow.com/a/9851769/1180785
export const firefox = (
	!nodejs &&
	typeof window.InstallTrigger !== 'undefined'
);
