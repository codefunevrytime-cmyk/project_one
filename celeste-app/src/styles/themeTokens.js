export function getTokens(isLight) {
  return {
    pageBg:        isLight ? '#FFF8E7' : '#1a1612',
    headerBg:      isLight ? 'linear-gradient(135deg, #FFEFCF 0%, #FFE3C2 60%, #FFEFCF 100%)' : 'linear-gradient(135deg, #180e04 0%, #1e1508 60%, #180e04 100%)',
    navBg:         isLight ? '#FFF3DA' : '#1a1510',
    cardBg:        isLight ? '#FFFDF7' : '#1e1a14',
    cardBgAlt:     isLight ? '#FFF3DA' : '#1c1812',
    cardBgMuted:   isLight ? '#FFEFDA' : '#181512',
    fallbackGrad:  isLight ? 'linear-gradient(135deg, #FFE3C2, #FFF3DA)' : 'linear-gradient(135deg, #2a1e0c, #1a1208)',
    imgFallbackBg: isLight ? '#FFEFDA' : '#15100a',

    border:        isLight ? 'rgba(255,148,120,0.22)' : 'rgba(200,175,120,0.15)',
    borderStrong:  isLight ? 'rgba(255,148,120,0.4)'  : 'rgba(200,175,120,0.3)',
    borderHover:   isLight ? 'rgba(255,148,120,0.5)'  : 'rgba(201,168,76,0.45)',
    borderFaint:   isLight ? 'rgba(255,148,120,0.12)' : 'rgba(255,255,255,0.06)',
    divider:       isLight ? 'rgba(255,148,120,0.18)' : 'rgba(255,255,255,0.07)',

    text:          isLight ? '#2D2D2D' : '#e8dcc8',
    textAlt:       isLight ? '#2D2D2D' : '#f0e6c8',
    textSecondary: isLight ? '#6b5a48' : 'rgba(240,230,200,0.5)',
    textMuted:     isLight ? '#8a7562' : 'rgba(200,175,120,0.4)',
    textFaint:     isLight ? '#a89680' : 'rgba(200,175,120,0.28)',

    gold:          isLight ? '#FF9478' : '#c8af78',
    goldStrong:    isLight ? '#E8836A' : '#d4a843',
    goldSoft:      isLight ? 'rgba(255,148,120,0.1)'  : 'rgba(200,175,120,0.1)',
    goldSoftAlt:   isLight ? 'rgba(255,148,120,0.06)' : 'rgba(201,168,76,0.06)',
    goldBorder:    isLight ? 'rgba(255,148,120,0.3)'  : 'rgba(200,175,120,0.2)',
    goldOnDark:    isLight ? '#fff' : '#141210', // text color sitting on a solid gold button

    danger:        '#f87171',
    dangerBg:      isLight ? 'rgba(248,113,113,0.08)' : 'rgba(248,113,113,0.08)',
    dangerBorder:  isLight ? 'rgba(248,113,113,0.25)' : 'rgba(248,113,113,0.2)',

    success:       isLight ? '#2e9e57' : '#5fcf7a',
    successBg:     isLight ? 'rgba(46,158,87,0.1)'  : 'rgba(95,207,122,0.08)',
    successBorder: isLight ? 'rgba(46,158,87,0.3)'  : 'rgba(95,207,122,0.25)',
  };
}