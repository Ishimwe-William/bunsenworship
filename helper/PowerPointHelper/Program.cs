using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace PowerPointHelper;

// Protocol message types
public class RequestMessage
{
    public string Id { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public Dictionary<string, object?>? Params { get; set; }
}

public class ResponseMessage
{
    public string Id { get; set; } = string.Empty;
    public bool Success { get; set; }
    public object? Result { get; set; }
    public string? Error { get; set; }
}

public class EventMessage
{
    public string Type { get; set; } = string.Empty;
    public object? Data { get; set; }
}

public class PowerPointController : IDisposable
{
    private dynamic? _powerPoint;
    private dynamic? _currentPresentation;
    private dynamic? _currentSlideShow;
    private bool _ownedPowerPoint = false;
    private readonly object _lock = new object();
    private readonly Action<EventMessage> _sendEvent;

    public PowerPointController(Action<EventMessage> sendEvent)
    {
        _sendEvent = sendEvent;
    }

    public async Task<ResponseMessage> HandleCommandAsync(RequestMessage request)
    {
        try
        {
            switch (request.Command.ToLowerInvariant())
            {
                case "ping":
                    return CreateSuccessResponse(request.Id, new { status = "ok", timestamp = DateTime.UtcNow.Ticks });

                case "open":
                    return await HandleOpenAsync(request);

                case "startslideshow":
                    return await HandleStartSlideshowAsync(request);

                case "next":
                    return HandleNext(request);

                case "prev":
                    return HandlePrev(request);

                case "gotoslide":
                    return HandleGotoSlide(request);

                case "getstate":
                    return HandleGetState(request);

                case "getslideinfo":
                    return await HandleGetSlideInfoAsync(request);

                case "endslideshow":
                    return HandleEndSlideshow(request);

                case "close":
                    return HandleClose(request);

                case "quit":
                    return HandleQuit(request);

                default:
                    return CreateErrorResponse(request.Id, $"Unknown command: {request.Command}");
            }
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, ex.Message);
        }
    }

    private async Task<ResponseMessage> HandleOpenAsync(RequestMessage request)
    {
        if (request.Params == null || !request.Params.ContainsKey("path"))
        {
            return CreateErrorResponse(request.Id, "Missing 'path' parameter");
        }

        string path = request.Params["path"]?.ToString() ?? string.Empty;
        if (string.IsNullOrEmpty(path) || !File.Exists(path))
        {
            return CreateErrorResponse(request.Id, $"File not found: {path}");
        }

        try
        {
            await InitializePowerPointAsync();

            // Close any existing presentation
            if (_currentPresentation != null)
            {
                try
                {
                    _currentPresentation.Close();
                }
                catch { }
                _currentPresentation = null;
            }

            // Open the presentation (read-only: -1, untitled: 0, withWindow: 0)
            _currentPresentation = _powerPoint!.Presentations.Open(path, -1, 0, 0);

            return CreateSuccessResponse(request.Id, new
            {
                title = _currentPresentation.Name,
                slideCount = _currentPresentation.Slides.Count,
                path = path
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to open presentation: {ex.Message}");
        }
    }

    private async Task<ResponseMessage> HandleStartSlideshowAsync(RequestMessage request)
    {
        if (_currentPresentation == null)
        {
            return CreateErrorResponse(request.Id, "No presentation is currently open");
        }

        try
        {
            await InitializePowerPointAsync();

            // Get slideshow settings and configure for windowed mode
            var settings = _currentPresentation.SlideShowSettings;
            settings.ShowType = 2; // ppShowTypeWindowed

            // Set starting slide if specified
            if (request.Params != null && request.Params.ContainsKey("startSlide"))
            {
                int startSlide = Convert.ToInt32(request.Params["startSlide"]);
                if (startSlide > 0 && startSlide <= _currentPresentation.Slides.Count)
                {
                    settings.StartingSlide = startSlide;
                }
            }

            // Start the slideshow
            _currentSlideShow = settings.Run();

            return CreateSuccessResponse(request.Id, new
            {
                isRunning = true,
                currentSlide = _currentSlideShow.CurrentShowPosition
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to start slideshow: {ex.Message}");
        }
    }

    private ResponseMessage HandleNext(RequestMessage request)
    {
        if (_currentSlideShow == null)
        {
            return CreateErrorResponse(request.Id, "No slideshow is currently running");
        }

        try
        {
            _currentSlideShow.Next();
            return CreateSuccessResponse(request.Id, new
            {
                currentSlide = _currentSlideShow.CurrentShowPosition
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to advance slide: {ex.Message}");
        }
    }

    private ResponseMessage HandlePrev(RequestMessage request)
    {
        if (_currentSlideShow == null)
        {
            return CreateErrorResponse(request.Id, "No slideshow is currently running");
        }

        try
        {
            _currentSlideShow.Previous();
            return CreateSuccessResponse(request.Id, new
            {
                currentSlide = _currentSlideShow.CurrentShowPosition
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to go to previous slide: {ex.Message}");
        }
    }

    private ResponseMessage HandleGotoSlide(RequestMessage request)
    {
        if (_currentSlideShow == null)
        {
            return CreateErrorResponse(request.Id, "No slideshow is currently running");
        }

        if (request.Params == null || !request.Params.ContainsKey("slideNumber"))
        {
            return CreateErrorResponse(request.Id, "Missing 'slideNumber' parameter");
        }

        try
        {
            int slideNumber = Convert.ToInt32(request.Params["slideNumber"]);
            _currentSlideShow.GotoSlide(slideNumber);
            return CreateSuccessResponse(request.Id, new
            {
                currentSlide = _currentSlideShow.CurrentShowPosition
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to go to slide: {ex.Message}");
        }
    }

    private ResponseMessage HandleGetState(RequestMessage request)
    {
        try
        {
            var result = new
            {
                isRunning = _currentSlideShow != null,
                currentSlide = _currentSlideShow?.CurrentShowPosition ?? 0,
                slideCount = _currentPresentation?.Slides.Count ?? 0,
                title = _currentPresentation?.Name,
                hasPresentation = _currentPresentation != null
            };

            return CreateSuccessResponse(request.Id, result);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to get state: {ex.Message}");
        }
    }

    private async Task<ResponseMessage> HandleGetSlideInfoAsync(RequestMessage request)
    {
        if (_currentPresentation == null)
        {
            return CreateErrorResponse(request.Id, "No presentation is currently open");
        }

        try
        {
            var slides = new List<object>();
            int slideCount = _currentPresentation.Slides.Count;

            for (int i = 1; i <= slideCount; i++)
            {
                var slide = _currentPresentation.Slides.Item(i);
                var slideInfo = new
                {
                    index = i,
                    title = $"Slide {i}",
                    notes = ""
                };

                // Try to extract text from the slide
                try
                {
                    var shapes = slide.Shapes;
                    var textLines = new List<string>();

                    for (int j = 1; j <= shapes.Count; j++)
                    {
                        try
                        {
                            var shape = shapes.Item(j);
                            if (shape.HasTextFrame && shape.TextFrame.HasText)
                            {
                                var text = shape.TextFrame.TextRange.Text;
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    textLines.Add(text.Trim());
                                }
                            }
                        }
                        catch { }
                    }

                    if (textLines.Count > 0)
                    {
                        slideInfo = new
                        {
                            index = i,
                            title = textLines[0].Length > 50 ? textLines[0].Substring(0, 50) : textLines[0],
                            notes = string.Join("\n", textLines)
                        };
                    }
                }
                catch { }

                slides.Add(slideInfo);
            }

            return CreateSuccessResponse(request.Id, new
            {
                title = _currentPresentation.Name,
                slideCount = slideCount,
                slides = slides
            });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to get slide info: {ex.Message}");
        }
    }

    private ResponseMessage HandleEndSlideshow(RequestMessage request)
    {
        if (_currentSlideShow == null)
        {
            return CreateSuccessResponse(request.Id, new { isRunning = false });
        }

        try
        {
            _currentSlideShow.Exit();
            _currentSlideShow = null;
            return CreateSuccessResponse(request.Id, new { isRunning = false });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to end slideshow: {ex.Message}");
        }
    }

    private ResponseMessage HandleClose(RequestMessage request)
    {
        try
        {
            if (_currentSlideShow != null)
            {
                try
                {
                    _currentSlideShow.Exit();
                }
                catch { }
                _currentSlideShow = null;
            }

            if (_currentPresentation != null)
            {
                try
                {
                    _currentPresentation.Close();
                }
                catch { }
                _currentPresentation = null;
            }

            return CreateSuccessResponse(request.Id, new { hasPresentation = false });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to close presentation: {ex.Message}");
        }
    }

    private ResponseMessage HandleQuit(RequestMessage request)
    {
        try
        {
            HandleClose(request);

            if (_ownedPowerPoint && _powerPoint != null)
            {
                try
                {
                    _powerPoint.Quit();
                }
                catch { }
                _powerPoint = null;
            }

            return CreateSuccessResponse(request.Id, new { status = "quit" });
        }
        catch (Exception ex)
        {
            return CreateErrorResponse(request.Id, $"Failed to quit: {ex.Message}");
        }
    }

    [DllImport("oleaut32.dll", PreserveSig = false)]
    private static extern void GetActiveObject(
        ref Guid rclsid,
        IntPtr pvReserved,
        [MarshalAs(UnmanagedType.IUnknown)] out object ppunk);

    [DllImport("ole32.dll", CharSet = CharSet.Unicode)]
    private static extern int CLSIDFromProgID(
        string lpszProgID,
        out Guid lpclsid);

    private static object? TryGetActiveObject(string progId)
    {
        try
        {
            int hr = CLSIDFromProgID(progId, out Guid clsid);
            if (hr < 0) return null;
            GetActiveObject(ref clsid, IntPtr.Zero, out object obj);
            return obj;
        }
        catch
        {
            return null;
        }
    }

    private async Task InitializePowerPointAsync()
    {
        if (_powerPoint != null) return;
        await Task.CompletedTask;

        try
        {
            // Try to get existing PowerPoint instance
            _powerPoint = TryGetActiveObject("PowerPoint.Application");
        }
        catch
        {
            _powerPoint = null;
        }

        if (_powerPoint == null)
        {
            // Create new instance
            Type? pptType = Type.GetTypeFromProgID("PowerPoint.Application");
            if (pptType != null)
            {
                _powerPoint = Activator.CreateInstance(pptType);
                _ownedPowerPoint = true;
            }
        }

        if (_powerPoint != null)
        {
            // Suppress alerts
            try
            {
                _powerPoint.DisplayAlerts = 0; // ppAlertsNone
            }
            catch { }
        }
    }

    private ResponseMessage CreateSuccessResponse(string id, object result)
    {
        return new ResponseMessage
        {
            Id = id,
            Success = true,
            Result = result
        };
    }

    private ResponseMessage CreateErrorResponse(string id, string error)
    {
        return new ResponseMessage
        {
            Id = id,
            Success = false,
            Error = error
        };
    }

    public void Dispose()
    {
        lock (_lock)
        {
            try
            {
                if (_currentSlideShow != null)
                {
                    _currentSlideShow.Exit();
                    _currentSlideShow = null;
                }

                if (_currentPresentation != null)
                {
                    _currentPresentation.Close();
                    _currentPresentation = null;
                }

                if (_ownedPowerPoint && _powerPoint != null)
                {
                    _powerPoint.Quit();
                    _powerPoint = null;
                }
            }
            catch { }
        }
    }
}

public class Program
{
    public static async Task Main(string[] args)
    {
        Console.SetError(TextWriter.Null); // Suppress stderr

        var sendEvent = new Action<EventMessage>(evt =>
        {
            try
            {
                var json = JsonConvert.SerializeObject(evt);
                Console.WriteLine(json);
            }
            catch { }
        });

        var controller = new PowerPointController(sendEvent);

        try
        {
            var stdin = Console.OpenStandardInput();
            var reader = new StreamReader(stdin, Encoding.UTF8);

            while (true)
            {
                var line = await reader.ReadLineAsync();
                if (line == null) break; // EOF

                try
                {
                    var request = JsonConvert.DeserializeObject<RequestMessage>(line);
                    if (request == null) continue;

                    var response = await controller.HandleCommandAsync(request);
                    var responseJson = JsonConvert.SerializeObject(response);
                    Console.WriteLine(responseJson);
                }
                catch (Exception ex)
                {
                    var errorResponse = new ResponseMessage
                    {
                        Id = "",
                        Success = false,
                        Error = $"Parse error: {ex.Message}"
                    };
                    Console.WriteLine(JsonConvert.SerializeObject(errorResponse));
                }
            }
        }
        finally
        {
            controller.Dispose();
        }
    }
}
