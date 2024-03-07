package gms.shared.stationdefinition.converter.util.assemblers;

import static gms.shared.stationdefinition.converter.ConverterWarnings.EFFECTIVE_TIME_NOT_NULL;
import static gms.shared.stationdefinition.converter.ConverterWarnings.EFFECTIVE_TIME_STR;
import static gms.shared.stationdefinition.converter.ConverterWarnings.END_TIME_BEFORE_START_TIME_STR;
import static gms.shared.stationdefinition.converter.ConverterWarnings.END_TIME_NOT_NULL;
import static gms.shared.stationdefinition.converter.ConverterWarnings.INSTRUMENTS_NOT_NULL;
import static gms.shared.stationdefinition.converter.ConverterWarnings.SENSORS_NOT_NULL;
import static gms.shared.stationdefinition.converter.ConverterWarnings.START_END_TIME_STR;
import static gms.shared.stationdefinition.converter.ConverterWarnings.START_TIME_NOT_NULL;
import static gms.shared.stationdefinition.converter.ConverterWarnings.WFDISCS_NOT_NULL;
import static java.util.stream.Collectors.toList;

import com.google.common.base.Functions;
import com.google.common.base.Preconditions;
import com.google.common.collect.Table;
import gms.shared.stationdefinition.coi.channel.Calibration;
import gms.shared.stationdefinition.coi.channel.FrequencyAmplitudePhase;
import gms.shared.stationdefinition.coi.channel.Response;
import gms.shared.stationdefinition.coi.utils.comparator.ResponseComparator;
import gms.shared.stationdefinition.converter.interfaces.CalibrationConverter;
import gms.shared.stationdefinition.converter.interfaces.FrequencyAmplitudePhaseConverter;
import gms.shared.stationdefinition.converter.interfaces.ResponseConverter;
import gms.shared.stationdefinition.dao.css.InstrumentDao;
import gms.shared.stationdefinition.dao.css.SensorDao;
import gms.shared.stationdefinition.dao.css.SensorKey;
import gms.shared.stationdefinition.dao.css.WfdiscDao;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import net.logstash.logback.argument.StructuredArguments;
import net.logstash.logback.marker.Markers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ResponseAssembler {

  private static final Logger LOGGER = LoggerFactory.getLogger(ResponseAssembler.class);
  private static final String STATION = "Station";
  private static final String CHANNEL = "Channel";
  private static final String EFFECTIVE_TIME = "Effective Time";

  private final ResponseConverter responseConverter;
  private final CalibrationConverter calibrationConverter;
  private final FrequencyAmplitudePhaseConverter fapConverter;

  public ResponseAssembler(
      ResponseConverter responseConverter,
      CalibrationConverter calibrationConverter,
      FrequencyAmplitudePhaseConverter fapConverter) {
    this.responseConverter = responseConverter;
    this.calibrationConverter = calibrationConverter;
    this.fapConverter = fapConverter;
  }

  public List<Response> buildAllForTime(
      Instant effectiveAt,
      List<WfdiscDao> wfdiscs,
      List<SensorDao> sensors,
      List<InstrumentDao> instruments,
      Optional<String> channelName) {

    Preconditions.checkNotNull(effectiveAt, EFFECTIVE_TIME_NOT_NULL);
    Preconditions.checkNotNull(wfdiscs, WFDISCS_NOT_NULL + EFFECTIVE_TIME_STR, effectiveAt);
    Preconditions.checkNotNull(sensors, SENSORS_NOT_NULL + EFFECTIVE_TIME_STR, effectiveAt);
    Preconditions.checkNotNull(instruments, INSTRUMENTS_NOT_NULL + EFFECTIVE_TIME_STR, effectiveAt);

    Table<String, String, NavigableMap<Instant, SensorDao>> sensorVersionsByStaChan =
        AssemblerUtils.buildVersionTable(
            Functions.compose(SensorKey::getStation, SensorDao::getSensorKey),
            Functions.compose(SensorKey::getChannel, SensorDao::getSensorKey),
            Functions.compose(SensorKey::getTime, SensorDao::getSensorKey),
            sensors);

    Map<Long, InstrumentDao> instrumentsById =
        instruments.stream()
            .collect(Collectors.toMap(InstrumentDao::getInstrumentId, Function.identity()));

    // group responses by Id
    Map<UUID, List<Response>> responsesGrouped =
        buildAllForTime(effectiveAt, wfdiscs, sensorVersionsByStaChan, instrumentsById, channelName)
            .stream()
            .sorted(new ResponseComparator())
            .collect(Collectors.groupingBy(Response::getId, Collectors.toList()));

    // get latest response from group since the response could be before the effectiveTime,
    // we want the closest response to effectiveTime, even if it's not valid for that time
    return responsesGrouped.values().stream()
        .map(value -> value.stream().reduce((first, second) -> second).orElse(null))
        .filter(Objects::nonNull)
        .collect(toList());
  }

  public List<Response> buildAllForTimeRange(
      Instant startTime,
      Instant endTime,
      List<WfdiscDao> wfdiscs,
      List<SensorDao> sensors,
      List<InstrumentDao> instruments,
      Optional<String> channelName) {

    Preconditions.checkNotNull(startTime, START_TIME_NOT_NULL);
    Preconditions.checkNotNull(endTime, END_TIME_NOT_NULL);
    Preconditions.checkNotNull(wfdiscs, WFDISCS_NOT_NULL + START_END_TIME_STR, startTime, endTime);
    Preconditions.checkNotNull(sensors, SENSORS_NOT_NULL + START_END_TIME_STR, startTime, endTime);
    Preconditions.checkNotNull(
        instruments, INSTRUMENTS_NOT_NULL + START_END_TIME_STR, startTime, endTime);
    Preconditions.checkState(
        !endTime.isBefore(startTime), END_TIME_BEFORE_START_TIME_STR, endTime, startTime);

    Table<String, String, NavigableMap<Instant, SensorDao>> sensorVersionsByStaChan =
        AssemblerUtils.buildVersionTable(
            Functions.compose(SensorKey::getStation, SensorDao::getSensorKey),
            Functions.compose(SensorKey::getChannel, SensorDao::getSensorKey),
            Functions.compose(SensorKey::getTime, SensorDao::getSensorKey),
            sensors);

    Map<Long, InstrumentDao> instrumentsById =
        instruments.stream()
            .collect(
                Collectors.toMap(
                    InstrumentDao::getInstrumentId, Function.identity(), (id1, id2) -> id1));

    return wfdiscs.stream()
        .sorted(Comparator.comparing(WfdiscDao::getTime))
        .map(
            wfdisc ->
                buildAllForTime(
                    wfdisc.getTime(),
                    List.of(wfdisc),
                    sensorVersionsByStaChan,
                    instrumentsById,
                    channelName))
        .flatMap(List::stream)
        .sorted(new ResponseComparator())
        .collect(toList());
  }

  private List<Response> buildAllForTime(
      Instant effectiveTime,
      Collection<WfdiscDao> wfdiscs,
      Table<String, String, NavigableMap<Instant, SensorDao>> sensorVersionsByStaChan,
      Map<Long, InstrumentDao> instrumentsById,
      Optional<String> channelName) {

    return wfdiscs.stream()
        .filter(wfdisc -> !wfdisc.getTime().isAfter(effectiveTime))
        .map(
            wfdisc -> {
              String station = wfdisc.getStationCode();
              String channel = wfdisc.getChannelCode();

              if (!sensorVersionsByStaChan.contains(station, channel)
                  || sensorVersionsByStaChan.get(station, channel).floorEntry(effectiveTime)
                      == null) {
                LOGGER.debug(
                    Markers.append(EFFECTIVE_TIME, effectiveTime),
                    "Cannot build response for channel {}.{} without sensor",
                    StructuredArguments.v(STATION, station),
                    StructuredArguments.v(CHANNEL, channel));
                return Optional.<Response>empty();
              }

              SensorDao sensor =
                  sensorVersionsByStaChan
                      .get(station, channel)
                      .floorEntry(effectiveTime)
                      .getValue();

              if (!instrumentsById.containsKey(sensor.getInstrument().getInstrumentId())) {
                LOGGER.debug(
                    Markers.append(EFFECTIVE_TIME, effectiveTime),
                    "Cannot build response for channel {}.{} without instrument",
                    StructuredArguments.v(STATION, station),
                    StructuredArguments.v(CHANNEL, channel));
                return Optional.<Response>empty();
              }

              InstrumentDao instrument =
                  instrumentsById.get(sensor.getInstrument().getInstrumentId());
              Calibration calibration = calibrationConverter.convert(wfdisc, sensor);
              var path = Path.of(instrument.getDirectory(), instrument.getDataFile());
              FrequencyAmplitudePhase fap =
                  (channelName.isPresent())
                      ? fapConverter.convert(channelName.orElseThrow(), path)
                      : // File path is used here solely for unique UUID generation (and never
                      // accessed)
                      fapConverter.convertToEntityReference(
                          instrument.getDirectory() + instrument.getDataFile());

              return Optional.ofNullable(
                  responseConverter.convert(wfdisc, sensor, calibration, fap));
            })
        .flatMap(Optional::stream)
        .distinct()
        .sorted(new ResponseComparator())
        .collect(toList());
  }

  public Response buildResponseEntity(WfdiscDao wfdiscDao) {
    return responseConverter.convertToEntity(wfdiscDao);
  }
}
