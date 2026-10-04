/**
 * Balance bar — a plain-JavaScript Client half that renders the DeepSeek account
 * balance in the sidebar foot, directly above the account row
 * (`sidebar.footer.action`), and opens the Platform usage page when clicked.
 *
 * Data comes from the shipped Client Remote namespace `ctx.remote.account`,
 * which already projects the recharge and bonus wallets. The half follows the
 * shipped account balance card: while a positive bonus exists the bonus row is
 * primary and the top-up row is a dimmed secondary line; without one only the
 * top-up row is drawn. Every read is folded into a display state so a failed or
 * disconnected Remote never blanks the slot entry.
 *
 * On Desktop the usage page opens exactly like the account settings page opens
 * it: a frame-wide overlay in `shell.overlay` that drives the main process's
 * Platform WebContentsView through the `dshPlatform` bridge, so the page keeps
 * the account session. Everywhere else the card stays a plain anchor that opens
 * a new tab.
 */
window.__ModuleLoader__.load({
	id: 'dsh-balance-bar',
	factory: (require) => {
		const React = require('react');
		const h = React.createElement;

		const PACKAGE_ID = 'dsh-balance-bar';
		const LOCALE_NS = 'balance-bar';
		const SLOT = 'sidebar.footer.action';
		const OVERLAY_SLOT = 'shell.overlay';
		const ENTRY_ID = 'balance-bar';
		const ENTRY_ORDER = -10;
		const POLL_MS = 60000;
		/** Build version the account Remote methods carry; mirrors the shipped Client. */
		const CLIENT_VERSION = '0.2.0-rc.2';

		const ZH = {
			bonusBalance: '赠金余额',
			rechargeBalance: '充值余额',
			loading: '加载中',
			unavailable: '暂时无法查询',
			signedOut: '未登录',
			openUsage: '查询用量',
			backToHarness: '返回 Harness',
			platformFailed: '页面加载失败',
			platformRetry: '重试',
		};
		const EN = {
			bonusBalance: 'Bonus balance',
			rechargeBalance: 'Top-up balance',
			loading: 'Loading',
			unavailable: 'Unavailable',
			signedOut: 'Signed out',
			openUsage: 'Usage',
			backToHarness: 'Back to Harness',
			platformFailed: 'Could not load the page',
			platformRetry: 'Retry',
		};

		const CSS = [
			'.dsh-balance-bar-root{box-sizing:border-box;flex:1 1 auto;min-width:0;display:block;text-decoration:none;color:inherit;border-radius:var(--dsw-radius-xl,10px)}',
			'.dsh-balance-bar-root[data-clickable="true"]{cursor:pointer}',
			'.dsh-balance-bar-root:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d93f8));outline-offset:2px}',
			'.dsh-balance-bar-card{box-sizing:border-box;display:flex;flex-direction:column;padding:8px 10px;border:.5px solid var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l1,rgba(128,128,128,.25)));border-radius:var(--dsw-radius-xl,10px);background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-1,rgba(128,128,128,.06)));color:var(--dsw-alias-label-primary,inherit);transition:background .12s ease}',
			'.dsh-balance-bar-root[data-clickable="true"]:hover .dsh-balance-bar-card{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}',
			'.dsh-balance-bar-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:22px}',
			'.dsh-balance-bar-label{display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:13px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
			'.dsh-balance-bar-label[data-indent="true"]{padding-left:20px}',
			'.dsh-balance-bar-icon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary,currentColor)}',
			'.dsh-balance-bar-amount{display:flex;flex-wrap:wrap;justify-content:flex-end;font-size:16px;font-weight:510;line-height:24px;font-variant-numeric:tabular-nums;white-space:nowrap}',
			'.dsh-balance-bar-amount>span+span::before{content:" + ";white-space:pre}',
			'.dsh-balance-bar-note{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary,inherit));font-size:13px;line-height:20px;white-space:nowrap}',
			'.dsh-balance-bar-secondary{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary,inherit))}',
			'.dsh-balance-bar-secondary .dsh-balance-bar-amount{font-size:13px;font-weight:400;line-height:20px}',
			'.dsh-balance-bar-overlay{z-index:1001;pointer-events:auto;background:var(--dsw-alias-bg-base,Canvas);flex-direction:column;display:flex;position:fixed;inset:0}',
			'[data-windows-titlebar] .dsh-balance-bar-overlay{padding-top:var(--dsh-windows-titlebar-height,0px)}',
			'.dsh-balance-bar-overlayHeader{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.25));flex:none;height:48px;padding:6px 16px}',
			'.dsh-balance-bar-overlayControls{align-items:center;gap:24px;padding-top:5px;display:flex}',
			'.dsh-balance-bar-trafficLights{flex:none;width:60.667px;height:14px;display:none}',
			'html[data-platform=darwin] .dsh-balance-bar-trafficLights{display:block}',
			'.dsh-balance-bar-back{box-sizing:border-box;border-radius:var(--dsw-radius-sm,6px);height:28px;color:var(--dsw-alias-label-secondary,inherit);font:inherit;white-space:nowrap;cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;gap:8px;padding:0 6px;font-size:14px;line-height:22px;display:inline-flex}',
			'.dsh-balance-bar-back:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}',
			'.dsh-balance-bar-back:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d93f8));outline-offset:2px}',
			'.dsh-balance-bar-viewport{min-height:0;color:var(--dsw-alias-label-secondary,inherit);flex:1;position:relative}',
			'.dsh-balance-bar-status{flex-direction:column;justify-content:center;align-items:center;gap:16px;display:flex;position:absolute;inset:0}',
			'.dsh-balance-bar-failure{color:var(--dsw-alias-label-tertiary,inherit);text-align:center;font-size:14px;line-height:22px}',
			'.dsh-balance-bar-retry{box-sizing:border-box;margin:0;border:.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));border-radius:var(--dsw-radius-md,6px);min-width:58px;height:32px;padding:0 12px;font-family:inherit;font-size:13px;font-weight:400;line-height:20px;color:inherit;background:0 0;cursor:pointer}',
			'.dsh-balance-bar-retry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}',
			'.dsh-balance-bar-spinner{width:24px;height:24px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));border-top-color:var(--dsw-alias-brand-primary,#4d93f8);animation:dsh-balance-bar-spin 1s linear infinite}',
			'@keyframes dsh-balance-bar-spin{to{transform:rotate(360deg)}}',
		].join('\n');

		/** Platform Web currency display: two decimals, grouped digits, sub-cent floor. */
		function formatBalance(amount, symbol) {
			const value = Number(amount);
			if (!Number.isFinite(value)) return `${symbol}--`;
			if (value === 0) return `${symbol}0.00`;
			if (value < 0) {
				return `-${symbol}${value > -0.01 ? '0.01' : group(Math.abs(value).toFixed(2))}`;
			}
			if (value < 0.01) return `<${symbol}0.01`;
			return `${symbol}${group((Math.floor(value * 100) / 100).toFixed(2))}`;
		}

		function group(text) {
			const [integer, fraction] = text.split('.');
			return `${Number(integer).toLocaleString()}.${fraction}`;
		}

		function positive(wallet) {
			const value = Number(wallet.balance);
			return Number.isFinite(value) && value > 0;
		}

		function formatWallets(wallets) {
			return wallets.map((wallet) => formatBalance(wallet.balance, wallet.currency === 'CNY' ? '¥' : '$'));
		}

		/**
		 * One outstanding native Platform page request. The last opener owns the
		 * single host view, so a later open supersedes an earlier one and the
		 * superseded opener is told to let go.
		 */
		function createPageStore() {
			let snapshot = null;
			let owner;
			let token = null;
			const listeners = new Set();
			const publish = () => {
				for (const listener of listeners) {
					try {
						listener();
					} catch (_error) {
						/* one throwing subscriber must not stop the rest */
					}
				}
			};
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				open(page) {
					const previous = owner;
					const own = {};
					token = own;
					owner = undefined;
					snapshot = { page };
					publish();
					previous?.('superseded');
				},
				close() {
					if (snapshot === null) return;
					const retiring = owner;
					token = null;
					owner = undefined;
					snapshot = null;
					publish();
					retiring?.('returned');
				},
				dispose() {
					token = null;
					owner = undefined;
					if (snapshot === null) return;
					snapshot = null;
					publish();
				},
			};
		}

		function WalletIcon() {
			return h(
				'svg',
				{ width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: false },
				h('rect', { x: 1.6, y: 4.1, width: 12.8, height: 7.8, rx: 1.8, stroke: 'currentColor', strokeWidth: 1.2 }),
				h('circle', { cx: 10.9, cy: 8, r: 0.95, fill: 'currentColor' }),
			);
		}

		function ChevronLeftIcon() {
			return h(
				'svg',
				{ width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: false },
				h('path', {
					d: 'M10 3.5 5.5 8l4.5 4.5',
					stroke: 'currentColor',
					strokeWidth: 1.4,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
				}),
			);
		}

		/** One row's right-hand side: formatted amounts, or the current read state. */
		function Value(props) {
			if (props.parts !== null) {
				return h(
					'span',
					{ className: 'dsh-balance-bar-amount' },
					props.parts.map((part, index) => h('span', { key: index }, part)),
				);
			}
			return h('span', { className: 'dsh-balance-bar-note' }, props.note);
		}

		/**
		 * The native Platform page host: a frame-wide overlay whose viewport rect is
		 * handed to the Desktop bridge, which draws the real page over it.
		 */
		function PlatformPage(props) {
			const back = React.useRef(null);
			const viewport = React.useRef(null);
			const [attempt, setAttempt] = React.useState(0);
			const [status, setStatus] = React.useState('loading');

			React.useLayoutEffect(() => {
				back.current?.focus();
			}, [props.page, attempt]);

			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key === 'Escape') props.onClose();
				};
				document.addEventListener('keydown', onKeyDown);
				return () => document.removeEventListener('keydown', onKeyDown);
			}, [props.onClose]);

			React.useEffect(() => {
				const element = viewport.current;
				if (element === null) return undefined;
				let closed = false;
				const bounds = () => {
					const rect = element.getBoundingClientRect();
					return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
				};
				const fail = () => {
					if (!closed) setStatus('failed');
				};
				setStatus('loading');
				Promise.resolve(props.bridge.open(props.page, bounds())).then(() => {
					if (!closed) setStatus('loaded');
				}, fail);
				const observer = new ResizeObserver(() => {
					Promise.resolve(props.bridge.setBounds(bounds())).catch(fail);
				});
				observer.observe(element);
				return () => {
					closed = true;
					observer.disconnect();
					Promise.resolve(props.bridge.close()).catch(() => {});
				};
			}, [props.bridge, props.page, attempt]);

			return h(
				'div',
				{ className: 'dsh-balance-bar-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.backLabel },
				h(
					'header',
					{ className: 'dsh-balance-bar-overlayHeader' },
					h(
						'div',
						{ className: 'dsh-balance-bar-overlayControls' },
						h('span', { className: 'dsh-balance-bar-trafficLights', 'aria-hidden': true }),
						h(
							'button',
							{ ref: back, type: 'button', className: 'dsh-balance-bar-back', onClick: props.onClose },
							h(ChevronLeftIcon, null),
							props.backLabel,
						),
					),
				),
				h(
					'div',
					{ ref: viewport, className: 'dsh-balance-bar-viewport' },
					status !== 'loaded' &&
						h(
							'div',
							{
								className: 'dsh-balance-bar-status',
								role: 'status',
								'aria-label': status === 'loading' ? props.loadingLabel : undefined,
							},
							status === 'failed'
								? h(
										React.Fragment,
										null,
										h('span', { className: 'dsh-balance-bar-failure' }, props.failureLabel),
										h(
											'button',
											{
												type: 'button',
												className: 'dsh-balance-bar-retry',
												onClick: () => setAttempt((value) => value + 1),
											},
											props.retryLabel,
										),
									)
								: h('span', { className: 'dsh-balance-bar-spinner', 'aria-hidden': true }),
						),
				),
			);
		}

		return {
			inject: ['slots', 'locale', 'remote', 'remote.account'],
			apply(ctx) {
				ctx.effect(() => ctx.locale.register(LOCALE_NS, { en: EN, zh: ZH }), 'balance-bar: dictionaries');
				const t = ctx.locale.bind(LOCALE_NS);
				const account = ctx.remote.account;
				/** Desktop renderer bridge to the single native Platform page view. */
				const bridge = globalThis.dshPlatform;
				const pages = bridge === undefined ? null : createPageStore();

				/** Identity of the requesting UI for one account call, read at call time. */
				const clientMetadata = () => ({
					version: CLIENT_VERSION,
					locale: ctx.locale.getSnapshot().active,
					timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
				});

				const unwrap = (result) =>
					result !== null && typeof result === 'object' && result.ok === true ? result.value : undefined;

				async function readAccount() {
					const meta = clientMetadata();
					const [view, balance] = await Promise.all([
						account.getState().then(unwrap, () => undefined),
						account.getBalance(meta).then(unwrap, () => undefined),
					]);
					return {
						view: view === undefined ? null : view,
						balance: balance === undefined ? null : balance,
					};
				}

				function BalanceBar(props) {
					const [snapshot, setSnapshot] = React.useState({ status: 'loading', view: null, balance: null });

					React.useEffect(() => {
						let alive = true;
						const refresh = async () => {
							let next = null;
							try {
								next = await readAccount();
							} catch (_error) {
								next = null;
							}
							if (!alive) return;
							if (next === null) setSnapshot((previous) => ({ ...previous, status: 'failed' }));
							else setSnapshot({ status: 'ready', view: next.view, balance: next.balance });
						};
						void refresh();
						const timer = window.setInterval(() => {
							if (document.visibilityState === 'visible') void refresh();
						}, POLL_MS);
						const onFocus = () => void refresh();
						const onVisibility = () => {
							if (document.visibilityState === 'visible') void refresh();
						};
						window.addEventListener('focus', onFocus);
						document.addEventListener('visibilitychange', onVisibility);
						return () => {
							alive = false;
							window.clearInterval(timer);
							window.removeEventListener('focus', onFocus);
							document.removeEventListener('visibilitychange', onVisibility);
						};
					}, []);

					if (props.wide === false) return null;

					const view = snapshot.view;
					const signedIn = view !== null && view.status === 'credential-stored';
					const balance = snapshot.balance;
					const readable = balance !== null && balance.status === 'ready';
					const bonusWallets = readable ? balance.bonusWallets.filter(positive) : [];
					const rechargeWallets = readable ? balance.value : [];
					const usageUrl =
						view !== null && view.links !== undefined && view.links !== null ? view.links.usageUrl : undefined;
					const pending = t(snapshot.status === 'loading' && !readable ? 'loading' : 'unavailable');
					const inline = pages !== null && signedIn;

					const label = (text, indent, withIcon) =>
						h(
							'span',
							{ className: 'dsh-balance-bar-label', ...(indent ? { 'data-indent': 'true' } : {}) },
							withIcon ? h('span', { className: 'dsh-balance-bar-icon' }, h(WalletIcon, null)) : null,
							text,
						);

					const row = (key, left, parts, note, secondary) =>
						h(
							'div',
							{ className: `dsh-balance-bar-row${secondary ? ' dsh-balance-bar-secondary' : ''}`, key },
							left,
							h(Value, { parts, note }),
						);

					const rows = [];
					if (!signedIn) {
						rows.push(
							row(
								'recharge',
								label(t('rechargeBalance'), false, true),
								null,
								t(snapshot.status === 'loading' ? 'loading' : 'signedOut'),
								false,
							),
						);
					} else if (!readable || bonusWallets.length > 0) {
						rows.push(
							row('bonus', label(t('bonusBalance'), false, true), readable ? formatWallets(bonusWallets) : null, pending, false),
							row('recharge', label(t('rechargeBalance'), true, false), readable ? formatWallets(rechargeWallets) : null, pending, true),
						);
					} else {
						rows.push(row('recharge', label(t('rechargeBalance'), false, true), formatWallets(rechargeWallets), pending, false));
					}

					const card = h('div', { className: 'dsh-balance-bar-card' }, rows);
					const openLabel = t('openUsage');
					/** Inside the app on Desktop, a new tab everywhere else. */
					const openUsage = (event) => {
						if (!inline) return;
						event.preventDefault();
						pages.open('usage');
					};
					if (usageUrl === undefined || usageUrl === '') {
						return h('div', { className: 'dsh-balance-bar-root' }, card);
					}
					return h(
						'a',
						{
							className: 'dsh-balance-bar-root',
							href: usageUrl,
							target: '_blank',
							rel: 'noopener noreferrer',
							title: openLabel,
							'aria-label': openLabel,
							'data-clickable': 'true',
							onClick: openUsage,
						},
						card,
					);
				}

				/** Frame-wide seat for the native Platform page; Desktop only. */
				function PlatformHost() {
					const claim = React.useSyncExternalStore(pages.subscribe, pages.getSnapshot, pages.getSnapshot);
					if (claim === null) return null;
					return h(PlatformPage, {
						bridge,
						page: claim.page,
						backLabel: t('backToHarness'),
						loadingLabel: t('loading'),
						failureLabel: t('platformFailed'),
						retryLabel: t('platformRetry'),
						onClose: pages.close,
					});
				}

				ctx.effect(() => {
					const tag = document.createElement('style');
					tag.dataset.plugin = PACKAGE_ID;
					tag.textContent = CSS;
					document.head.appendChild(tag);
					return () => {
						tag.remove();
					};
				}, 'balance-bar: styles');

				if (pages !== null) {
					ctx.effect(
						() => () => {
							pages.dispose();
						},
						'balance-bar: platform page lifetime',
					);
					ctx.slots.inject(OVERLAY_SLOT, () =>
						ctx.slots.register({ name: OVERLAY_SLOT, id: `${ENTRY_ID}.platform-page`, order: 5 }, PlatformHost),
					);
				}

				ctx.slots.inject(SLOT, () =>
					ctx.slots.register({ name: SLOT, id: ENTRY_ID, order: ENTRY_ORDER }, BalanceBar),
				);
			},
		};
	},
});
