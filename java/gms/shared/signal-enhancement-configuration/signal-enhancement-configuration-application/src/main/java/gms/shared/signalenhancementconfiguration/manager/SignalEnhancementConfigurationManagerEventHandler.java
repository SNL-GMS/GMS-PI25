package gms.shared.signalenhancementconfiguration.manager;

import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.client.HttpServerErrorException;

@ControllerAdvice
class SignalEnhancementConfigurationManagerEventHandler {

  private static final Logger LOGGER =
      LoggerFactory.getLogger(SignalEnhancementConfigurationManagerEventHandler.class);

  public static final String INPUT_ERROR_MSG =
      "Could not parse request, check your inputs and try again";
  public static final String ERROR_MSG_KEY = "errorMessage";
  public static final String ERROR_INFO_KEY = "errorInformation";

  @ExceptionHandler(HttpMessageNotReadableException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ResponseEntity<Map<String, String>> handle(HttpMessageNotReadableException ex) {
    var regexString = ".+?(?=; nested)";
    var simpleErrorRegex = Pattern.compile(regexString);
    var matcher =
        ex.getLocalizedMessage() != null
            ? simpleErrorRegex.matcher(ex.getLocalizedMessage())
            : null;
    var errorMessage = matcher != null && matcher.find() ? matcher.group(0) : INPUT_ERROR_MSG;

    LOGGER.warn("Exception occurred: {}", errorMessage, ex);
    return ResponseEntity.badRequest().body(Map.of(ERROR_MSG_KEY, errorMessage));
  }

  @ExceptionHandler(HttpServerErrorException.InternalServerError.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ResponseEntity<Map<String, String>> handle(
      HttpServerErrorException.InternalServerError ex) {
    var errorMessage = "Internal error occurred while processing request";
    return ResponseEntity.internalServerError().body(Map.of(ERROR_MSG_KEY, errorMessage));
  }
}
