import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

public class ElyByAuth {
    private static final String AUTH_URL = "https://ely.by";

    public static void main(String[] args) {
        // Replace with actual user credentials
        String emailOrUsername = "your_elyby_username";
        String password = "your_elyby_password";

        try {
            String jsonPayload = "{"
                    + "\"agent\": {\"name\": \"Minecraft\", \"version\": 1},"
                    + "\"username\": \"" + emailOrUsername + "\","
                    + "\"password\": \"" + password + "\","
                    + "\"requestUser\": true"
                    + "}";

            URL url = new URL(AUTH_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                Scanner scanner = new Scanner(conn.getInputStream(), StandardCharsets.UTF_8);
                String response = scanner.useDelimiter("\\A").next();
                scanner.close();
                System.out.println("Login Success! Response Data:\n" + response);
            } else {
                System.out.println("Authentication Failed. Response Code: " + responseCode);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}