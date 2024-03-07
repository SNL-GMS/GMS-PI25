package gms.shared.featureprediction.utilities.math;

public class GeoMath {

  // NOTE: Eventually the project-wide earth radius will be exposed in some common location.  When
  // that happens, use that value here instead of the current value, which is from the wiki at
  // /pages/viewpage.action?pageId=337859272
  public static final double RADIUS_KM = 6371.0;
  public static final double DEGREES_PER_KM = 360.0 / (2.0 * Math.PI * RADIUS_KM);
  private static final int DEGREES_IN_CIRCLE = 360;

  private GeoMath() {
    // Static utility class
  }

  /**
   * Normalizes latitude and longitude to [-90,90] and [-180,180] respectively
   *
   * @param lat latitude
   * @param lon longitude
   * @return normalized latitude and longitude, in that order
   */
  public static double[] normalizeLatLon(double lat, double lon) {
    while (Double.compare(lat, -180.0) < 0) {
      lat += 360.0;
    }
    while (Double.compare(lat, 180.0) > 0) {
      lat -= 360.0;
    }
    if (Double.compare(lat, -90.0) < 0) {
      lat = -180.0 - lat;
      lon += 180.0;
    }
    if (Double.compare(lat, 90.0) > 0) {
      lat = 180.0 - lat;
      lon += 180.0;
    }
    while (Double.compare(lon, -180.0) < 0) {
      lon += 360.0;
    }
    while (Double.compare(lon, 180.0) > 0) {
      lon -= 360.0;
    }
    return new double[] {lat, lon};
  }

  /**
   * Normalizes latitude to [-90,90]
   *
   * @param lat latitude
   * @return normalized latitude
   */
  public static double normalizeLatitude(double lat) {
    while (Double.compare(lat, -180.0) < 0) {
      lat += 360.0;
    }
    while (Double.compare(lat, 180.0) > 0) {
      lat -= 360.0;
    }
    if (Double.compare(lat, -90.0) < 0) {
      lat = -180.0 - lat;
    }
    if (Double.compare(lat, 90.0) > 0) {
      lat = 180.0 - lat;
    }
    return lat;
  }

  /**
   * Returns {@code true} if latitude and longitude are normalized, {@code false} otherwise.
   *
   * @param lat latitude
   * @param lon longitude
   * @return {@code true} if latitude and longitude are normalized, {@code false} otherwise
   */
  public static boolean isNormalizedLatLon(final double lat, final double lon) {
    return Double.compare(lat, -90.0) >= 0
        && Double.compare(lat, 90.0) <= 0
        && Double.compare(lon, -180.0) >= 0
        && Double.compare(lon, 180.0) <= 0;
  }

  /**
   * Uses PCALC implementation of angular separation between two lat/lons in degrees, assuming a
   * spherical earth model. Minimizes calls to trig functions for efficiency.
   *
   * @param lat1 latitude of 1st point in degrees [-90, 90]
   * @param lon1 longitude of 1st point in degrees [-180, 180]
   * @param lat2 latitude of 2nd point in degrees [-90, 90]
   * @param lon2 longitude of 2nd point in degrees [-180, 180]
   * @return great circle distance in degrees
   */
  public static double greatCircleAngularSeparation(
      double lat1, double lon1, double lat2, double lon2) {
    double[] vec1 = EarthShape.SPHERE.getVectorDegrees(lat1, lon1);
    double[] vec2 = EarthShape.SPHERE.getVectorDegrees(lat2, lon2);
    return VectorUnit.angleDegrees(vec1, vec2);
  }

  /**
   * Calculate the azimuth from point one to two on the earth
   *
   * @param latitude1 - latitude of first point
   * @param longitude1 - longitude of first point
   * @param latitude2 - latitude of second point
   * @param longitude2 - longitude of second point
   */
  public static double azimuth(
      double latitude1, double longitude1, double latitude2, double longitude2) {
    double delta = Math.toRadians(longitude2 - longitude1);
    double latitudeRadians1 = Math.toRadians(latitude1);
    double latitudeRadians2 = Math.toRadians(latitude2);
    double azimuth =
        Math.toDegrees(
            Math.atan2(
                Math.sin(delta) * Math.cos(latitudeRadians2),
                Math.cos(latitudeRadians1) * Math.sin(latitudeRadians2)
                    - Math.sin(latitudeRadians1) * Math.cos(latitudeRadians2) * Math.cos(delta)));

    return azimuth < 0 ? (azimuth + DEGREES_IN_CIRCLE) : azimuth;
  }

  /**
   * Convert latitude in degrees [-90,90] to colatitude in degrees [0,180]
   *
   * @param latitude latitude in degrees [-90,90]
   * @return colatitude in degrees [0,180]
   */
  public static double toColatitudeDeg(double latitude) {
    return 90.0 - latitude;
  }

  /**
   * Convert degrees to kilometers
   *
   * @param degrees degree value to convert
   * @return distance in kilometers
   */
  public static double degToKm(double degrees) {
    return degrees / DEGREES_PER_KM;
  }
}
