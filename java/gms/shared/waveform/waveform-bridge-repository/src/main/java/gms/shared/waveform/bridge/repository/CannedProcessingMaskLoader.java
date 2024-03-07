package gms.shared.waveform.bridge.repository;

import gms.shared.stationdefinition.coi.channel.Channel;
import gms.shared.stationdefinition.coi.qc.ProcessingOperation;
import gms.shared.utilities.javautilities.objectmapper.ObjectMapperFactory;
import gms.shared.waveform.processingmask.coi.PMDataList;
import gms.shared.waveform.processingmask.coi.ProcessingMask;
import gms.shared.waveform.qc.coi.QcDataList;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope
public class CannedProcessingMaskLoader implements ProcessingMaskLoader {

  private static final Logger LOGGER = LoggerFactory.getLogger(CannedProcessingMaskLoader.class);

  private static final Map<String, ProcessingOperation> stationOperationMap =
      Map.of(
          "ASAR", ProcessingOperation.AMPLITUDE_MEASUREMENT_BEAM,
          "FINES", ProcessingOperation.DISPLAY_FILTER,
          "DBIC", ProcessingOperation.SPECTROGRAM,
          "LPAZ", ProcessingOperation.VIRTUAL_BEAM);

  private final Set<String> seenStations = new HashSet<>();

  @Override
  public List<ProcessingMask> loadProcessingMasks(
      Channel channel, Instant startTime, Instant dummyEndTime) {

    LOGGER.debug(
        "Loading processing masks for channel:{} startTime:{}", channel.getName(), startTime);

    // String.split uses a regular expresion. It just so happnes that as of this
    // writing, Channel.NAME_SEPERATOR is ".", which would need to be escaped.
    var name = channel.getName();
    var station = name.substring(0, name.indexOf(Channel.NAME_SEPARATOR));

    if (seenStations.contains(station)) {
      return List.of();
    }

    seenStations.add(station);

    return loadCannedData(startTime).stream()
        .filter(
            mask ->
                mask.getData().get().getProcessingOperation() == stationOperationMap.get(station))
        .findFirst()
        .map(List::of)
        .orElse(List.of());
  }

  private static List<ProcessingMask> loadCannedData(Instant startTime) {
    try (InputStream qcJsonFile =
            Thread.currentThread().getContextClassLoader().getResourceAsStream("QcDataSet.json");
        InputStream pmJsonFile =
            Thread.currentThread().getContextClassLoader().getResourceAsStream("pmdatalist.json")) {
      var qcJsonData =
          ObjectMapperFactory.getJsonObjectMapper().readValue(qcJsonFile, QcDataList.class);
      var pmJsonData =
          ObjectMapperFactory.getJsonObjectMapper().readValue(pmJsonFile, PMDataList.class);

      return new PmDataGenerator()
          .createProcessingMasks(pmJsonData.getPmList(), qcJsonData.getQcList(), startTime);
    } catch (IOException ex) {
      throw new LoadCannedDataRuntimeException(ex);
    }
  }

  private static class LoadCannedDataRuntimeException extends RuntimeException {
    public LoadCannedDataRuntimeException(IOException ex) {}
  }
}
