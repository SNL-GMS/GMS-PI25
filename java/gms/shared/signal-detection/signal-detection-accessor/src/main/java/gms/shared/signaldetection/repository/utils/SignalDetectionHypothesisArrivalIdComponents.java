package gms.shared.signaldetection.repository.utils;

import com.google.auto.value.AutoValue;
import java.util.Comparator;

@AutoValue
public abstract class SignalDetectionHypothesisArrivalIdComponents
    implements Comparable<SignalDetectionHypothesisArrivalIdComponents> {

  public abstract String getLegacyDatabaseAccountId();

  public abstract long getArid();

  public static SignalDetectionHypothesisArrivalIdComponents create(
      String legacyDatabaseAccountId, long arid) {
    return new AutoValue_SignalDetectionHypothesisArrivalIdComponents(
        legacyDatabaseAccountId, arid);
  }

  @Override
  public int compareTo(SignalDetectionHypothesisArrivalIdComponents sdhaic) {
    // simple compareTo to satify sonarqube smell
    return Comparator.comparing(SignalDetectionHypothesisArrivalIdComponents::getArid)
        .thenComparing(SignalDetectionHypothesisArrivalIdComponents::getLegacyDatabaseAccountId)
        .compare(this, sdhaic);
  }

  @Override
  public boolean equals(Object o) {

    if (o == null) {
      return false;
    }
    if (o == this) {
      return true;
    }
    if (o.getClass() == this.getClass()) {
      SignalDetectionHypothesisArrivalIdComponents that =
          (SignalDetectionHypothesisArrivalIdComponents) o;
      return this.getLegacyDatabaseAccountId().equals(that.getLegacyDatabaseAccountId())
          && this.getArid() == that.getArid();
    }
    return false;
  }

  @Override
  public int hashCode() {
    var h = 1;
    h *= 1_000_003;
    h ^= this.getLegacyDatabaseAccountId().hashCode();
    h *= 1_000_003;
    h ^= (int) ((this.getArid() >>> 32) ^ this.getArid());
    return h;
  }
}
