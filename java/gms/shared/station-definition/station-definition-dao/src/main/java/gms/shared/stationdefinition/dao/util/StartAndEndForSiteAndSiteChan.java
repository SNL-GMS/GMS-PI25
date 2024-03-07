package gms.shared.stationdefinition.dao.util;

import gms.shared.stationdefinition.dao.css.SiteChanDao;
import gms.shared.stationdefinition.dao.css.SiteDao;
import java.util.HashMap;

public class StartAndEndForSiteAndSiteChan {

  private HashMap<String, Boolean> staCodeToPrevTimeOverlap;
  private HashMap<String, Boolean> staCodeToNextTimeOverlap;
  private HashMap<String, Boolean> staChanCodeToPrevTimeOverlap;
  private HashMap<String, Boolean> staChanCodeToNextTimeOverlap;

  public StartAndEndForSiteAndSiteChan() {
    staCodeToPrevTimeOverlap = new HashMap<>();
    staCodeToNextTimeOverlap = new HashMap<>();
    staChanCodeToPrevTimeOverlap = new HashMap<>();
    staChanCodeToNextTimeOverlap = new HashMap<>();
  }

  public void setPrevTimeOverLapForSite(SiteDao site, boolean bool) {
    staCodeToPrevTimeOverlap.put(site.getId().getStationCode(), bool);
  }

  public void setNextTimeOverLapForSite(SiteDao site, boolean bool) {
    staCodeToNextTimeOverlap.put(site.getId().getStationCode(), bool);
  }

  public void setPrevTimeOverLapForSiteChan(SiteChanDao siteChan, boolean bool) {
    staChanCodeToPrevTimeOverlap.put(getStaChanCode(siteChan), bool);
  }

  public void setNextTimeOverLapForSiteChan(SiteChanDao siteChan, boolean bool) {
    staChanCodeToNextTimeOverlap.put(getStaChanCode(siteChan), bool);
  }

  public boolean getPrevTimeOverLapForSite(SiteDao site) {
    Boolean bool = staCodeToPrevTimeOverlap.get(site.getId().getStationCode());

    return bool != null && bool;
  }

  public boolean getNextTimeOverLapForSite(SiteDao site) {
    Boolean bool = staCodeToNextTimeOverlap.get(site.getId().getStationCode());
    return bool != null && bool;
  }

  public boolean getPrevTimeOverLapForSiteChan(SiteChanDao siteChan) {
    Boolean bool = staChanCodeToPrevTimeOverlap.get(getStaChanCode(siteChan));
    return bool != null && bool;
  }

  public boolean getNextTimeOverLapForSiteChan(SiteChanDao siteChan) {
    Boolean bool = staChanCodeToNextTimeOverlap.get(getStaChanCode(siteChan));
    return bool != null && bool;
  }

  private static String getStaChanCode(SiteChanDao siteChan) {
    return siteChan.getId().getStationCode() + siteChan.getId().getChannelCode();
  }
}
