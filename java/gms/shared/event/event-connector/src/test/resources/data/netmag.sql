INSERT INTO GMS_GLOBAL.NETMAG (  
  MAGID,
	NET,
	ORID,
	EVID,
	MAGTYPE,
	NSTA,
	MAGNITUDE ,
	UNCERTAINTY ,
	AUTH,
	COMMID,
	LDDATE
) VALUES (
  1, 'AA', 1111, 2222, 'BB', 10, 1.0, 1.0, 'AUTH', 1234, TO_DATE('1980-04-23 13:49:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO GMS_GLOBAL.NETMAG (
  MAGID,
	NET,
	ORID,
	EVID,
	MAGTYPE,
	NSTA,
	MAGNITUDE ,
	UNCERTAINTY ,
	AUTH,
	COMMID,
	LDDATE
) VALUES (
  2, 'BB', 1111, 1111, 'AA', 10, 2.0, 1.0, 'AUTH', 1234, TO_DATE('1980-04-23 13:49:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO GMS_GLOBAL.NETMAG (
  MAGID,
	NET,
	ORID,
	EVID,
	MAGTYPE,
	NSTA,
	MAGNITUDE ,
	UNCERTAINTY ,
	AUTH,
	COMMID,
	LDDATE
) VALUES (
  1111, 'BB', 22222, 1111, 'AA', 10, 2.0, 1.0, 'AUTH', 1234, TO_DATE('1980-04-23 13:49:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO GMS_GLOBAL.NETMAG (
  MAGID,
	NET,
	ORID,
	EVID,
	MAGTYPE,
	NSTA,
	MAGNITUDE ,
	UNCERTAINTY ,
	AUTH,
	COMMID,
	LDDATE
) VALUES (
  2222, 'BB', 22222, 1111, 'AA', 10, 2.0, 1.0, 'AUTH', 1234, TO_DATE('1980-04-23 13:49:00', 'YYYY-MM-DD HH24:MI:SS')
);

INSERT INTO GMS_GLOBAL.NETMAG (
  MAGID,
	NET,
	ORID,
	EVID,
	MAGTYPE,
	NSTA,
	MAGNITUDE ,
	UNCERTAINTY ,
	AUTH,
	COMMID,
	LDDATE
) VALUES (
  3333, 'BB', 22222, 1111, 'AA', 10, 2.0, 1.0, 'AUTH', 1234, TO_DATE('1980-04-23 13:49:00', 'YYYY-MM-DD HH24:MI:SS')
);