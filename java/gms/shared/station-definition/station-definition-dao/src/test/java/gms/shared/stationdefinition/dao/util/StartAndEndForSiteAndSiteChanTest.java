package gms.shared.stationdefinition.dao.util;

import static org.junit.jupiter.api.Assertions.assertTrue;

import gms.shared.stationdefinition.testfixtures.DefaultCoiTestFixtures;
import org.junit.jupiter.api.Test;

class StartAndEndForSiteAndSiteChanTest {

  @Test
  void testMissingSiteAndSiteChan() {

    var startAndEnd = new StartAndEndForSiteAndSiteChan();
    var site = DefaultCoiTestFixtures.getDefaultSiteDao();
    var siteChan = DefaultCoiTestFixtures.getDefaultSiteChanDao();

    assertTrue(!startAndEnd.getNextTimeOverLapForSite(site));
    assertTrue(!startAndEnd.getNextTimeOverLapForSiteChan(siteChan));

    assertTrue(!startAndEnd.getPrevTimeOverLapForSite(site));
    assertTrue(!startAndEnd.getPrevTimeOverLapForSiteChan(siteChan));

    startAndEnd.setNextTimeOverLapForSite(site, true);
    startAndEnd.setNextTimeOverLapForSiteChan(siteChan, true);

    assertTrue(startAndEnd.getNextTimeOverLapForSite(site));
    assertTrue(startAndEnd.getNextTimeOverLapForSiteChan(siteChan));

    startAndEnd.setPrevTimeOverLapForSite(site, true);
    startAndEnd.setPrevTimeOverLapForSiteChan(siteChan, true);

    assertTrue(startAndEnd.getPrevTimeOverLapForSite(site));
    assertTrue(startAndEnd.getPrevTimeOverLapForSiteChan(siteChan));

    startAndEnd.setNextTimeOverLapForSite(site, false);
    startAndEnd.setNextTimeOverLapForSiteChan(siteChan, false);

    assertTrue(!startAndEnd.getNextTimeOverLapForSite(site));
    assertTrue(!startAndEnd.getNextTimeOverLapForSiteChan(siteChan));

    startAndEnd.setPrevTimeOverLapForSite(site, false);
    startAndEnd.setPrevTimeOverLapForSiteChan(siteChan, false);

    assertTrue(!startAndEnd.getPrevTimeOverLapForSite(site));
    assertTrue(!startAndEnd.getPrevTimeOverLapForSiteChan(siteChan));
  }
}
