CREATE TABLE GMS_GLOBAL.STAMAG (
  MAGID NUMBER(18,0),
	AMPID NUMBER(18,0), 
	STA VARCHAR2(6 BYTE), 
	ARID NUMBER(18,0), 
	ORID NUMBER(18,0), 
	EVID NUMBER(18,0), 
	PHASE VARCHAR2(8 BYTE), 
	DELTA FLOAT(24), 
	MAGTYPE VARCHAR2(6 BYTE), 
	MAGNITUDE FLOAT(24), 
	UNCERTAINTY FLOAT(24), 
	MAGRES FLOAT(24), 
	MAGDEF VARCHAR2(1 BYTE), 
	MMODEL VARCHAR2(15 BYTE), 
	AUTH VARCHAR2(15 BYTE), 
	COMMID NUMBER(18,0), 
	LDDATE DATE, 
	CONSTRAINT STAMAG_PK PRIMARY KEY (MAGID, AMPID, STA)
)