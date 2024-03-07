package gms.shared.waveform.bridge.repository;

import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class CannedProcessingMaskLoaderTest {

  @Test
  void testAllCannedChannels() {

    Map<String, ProcessingOperation> stationOperationMap =
        Map.of(
            "ASAR", ProcessingOperation.AMPLITUDE_MEASUREMENT_BEAM,
            "FINES", ProcessingOperation.DISPLAY_FILTER,
            "DBIC", ProcessingOperation.SPECTROGRAM,
            "LPAZ", ProcessingOperation.VIRTUAL_BEAM);

    stationOperationMap.forEach(
        (station, operation) -> {
          var mockChannel = Mockito.mock(Channel.class);

          // Create interesting channel name to excercise parsing out station
          Mockito.when(mockChannel.getName()).thenReturn(station + ".beam.Z/stuff");

          var processingMasks =
              new CannedProcessingMaskLoader()
                  .loadProcessingMasks(mockChannel, Instant.EPOCH, null);

          Assertions.assertNotNull(processingMasks);
          Assertions.assertEquals(1, processingMasks.size());
          Assertions.assertEquals(
              operation, processingMasks.get(0).getData().get().getProcessingOperation());
          System.err.println(processingMasks.get(0).getData().get().getProcessingOperation());
        });
  }

  @Test
  void testSingletonPerStation() {

    var processingMaskLoader = new CannedProcessingMaskLoader();

    var mockChannel = Mockito.mock(Channel.class);
    Mockito.when(mockChannel.getName()).thenReturn("ASAR.xyz");

    var processingMasks =
        processingMaskLoader.loadProcessingMasks(mockChannel, Instant.EPOCH, null);

    Assertions.assertEquals(1, processingMasks.size());

    processingMasks = processingMaskLoader.loadProcessingMasks(mockChannel, Instant.EPOCH, null);

    Assertions.assertEquals(0, processingMasks.size());
  }
}
