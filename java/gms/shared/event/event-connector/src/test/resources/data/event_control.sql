INSERT INTO GMS_GLOBAL.EVENT_CONTROL (
	ORID,
	EVID,
	PREFER_LOC,
	CONSTRAIN_OT,
	CONSTRAIN_LATLON,
	CONSTRAIN_DEPTH,
	SRC_DPNT_CORR ,
	LOC_SRC_DPNT_REG,
	LOC_SDV_SCREEN,
	LOC_SDV_MULT,
	LOC_ALPHA_ONLY,
	LOC_ALL_STAS,
	LOC_DIST_VARWGT,
	LOC_USER_VARWGT,
	MAG_SRC_DPNT_REG,
	MAG_SDV_SCREEN,
	MAG_SDV_MULT,
	MAG_ALPHA_ONLY,
	MAG_ALL_STAS,
	MB_MIN_DIST,
	MB_MAX_DIST,
	MMODEL,
	COV_SM_AXES,
	COV_DEPTH_TIME,
	OBS_CORR_METHOD,
	LDDATE
) VALUES (
  11111,
  1111,
  'L',
  1,
  1,
  1,
  23,
  'GGGHHHFFFGGG',
  1,
  10,
  1,
  1,
  1,
  10,
  'FFFDDDFFFFF',
  1,
  10,
  1,
  1,
  10,
  10,
  'FDFDFDFDFDFDF',
  10,
  10,
  1,
  TO_DATE('1980-04-23 13:49:00', 'YYYY-MM-DD HH24:MI:SS')
);